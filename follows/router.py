from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from follows.models import Follow
from follows import crud, schemas
from auth.crud import get_current_user
from users.crud import get_user
from follows.crud import is_accepted_follower
from users.schemas import UserShort
from notifications.crud import create_notification
from users.models import User

router = APIRouter(prefix="/follows", tags=["follows"])


@router.post("/{user_id}", status_code=status.HTTP_201_CREATED)
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    follow = crud.follow_user(db, current_user.id, user_id, target_user.is_private)
    
    create_notification(
        db,
        to_user_id=user_id,
        from_user_id=current_user.id,
        type="follow",
        entity_id=None
    )
    
    if target_user.is_private:
        return {"detail": "Follow request sent"}
    return {"detail": "Followed"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    crud.unfollow_user(db, current_user.id, user_id)


@router.put("/{follow_id}/accept", status_code=status.HTTP_200_OK)
def accept_follow_by_id(
    follow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow = db.query(Follow).filter(Follow.id == follow_id).first()
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")
    if follow.following_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your follow request")
    if follow.status != "pending":
        raise HTTPException(status_code=400, detail="No pending request")
    crud.accept_follow(db, follow.follower_id, follow.following_id)
    return {"detail": "Follow request accepted"}


@router.post("/{follower_id}/accept", status_code=status.HTTP_200_OK)
def accept_follow(
    follower_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    follow = crud.get_follow(db, follower_id, current_user.id)
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")
    if follow.status != "pending":
        raise HTTPException(status_code=400, detail="No pending request")
    crud.accept_follow(db, follower_id, current_user.id)
    return {"detail": "Follow request accepted"}


@router.delete("/{follower_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_follow(
    follower_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    follow = crud.get_follow(db, follower_id, current_user.id)
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")
    crud.reject_follow(db, follower_id, current_user.id)


@router.get("/requests/pending", response_model=list[schemas.FollowShort])
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = crud.get_pending_requests(db, current_user.id)
    return [
        {
            "id": r.id,
            "user": get_user(db, r.follower_id),
            "status": r.status,
            "created_at": r.created_at
        }
        for r in requests
    ]


@router.get("/{user_id}/followers", response_model=list[UserShort])
def get_followers(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_user.is_private and target_user.id != current_user.id:
        if not is_accepted_follower(db, current_user.id, target_user.id):
            raise HTTPException(status_code=403, detail="This account is private")
    follows = crud.get_followers(db, user_id, skip, limit)
    return [get_user(db, f.follower_id) for f in follows]


@router.get("/{user_id}/following", response_model=list[UserShort])
def get_following(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_user.is_private and target_user.id != current_user.id:
        if not is_accepted_follower(db, current_user.id, target_user.id):
            raise HTTPException(status_code=403, detail="This account is private")
    follows = crud.get_following(db, user_id, skip, limit)
    return [get_user(db, f.following_id) for f in follows]


@router.get("/{user_id}/status")
def get_follow_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    follow = crud.get_follow(db, current_user.id, user_id)
    if not follow:
        return {"status": "none"}
    return {"status": follow.status}


@router.get("/{user_id}/counts")
def get_follow_counts(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "followers": crud.get_followers_count(db, user_id),
        "following": crud.get_following_count(db, user_id)
    }
