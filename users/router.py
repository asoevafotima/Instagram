from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from users import crud, schemas
from auth.crud import get_current_user
from follows.crud import get_followers_count, get_following_count
from users.models import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_me(data: schemas.UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.update_user(db, current_user.id, data)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    crud.delete_user(db, current_user.id)


@router.get("/search", response_model=list[schemas.UserShort])
def search_users(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud.search_users(db, q)


@router.get("/suggestions/list", response_model=list[schemas.UserShort])
def get_suggestions(limit: int = 5, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from follows.models import Follow
    following_ids = {
        r.following_id
        for r in db.query(Follow.following_id).filter(Follow.follower_id == current_user.id).all()
    }
    following_ids.add(current_user.id)
    all_users = db.query(User).filter(User.id.notin_(following_ids)).limit(limit).all()
    return all_users


@router.get("/username/{username}", response_model=schemas.UserResponse)
def get_user_by_username(username: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/followers", response_model=list[schemas.UserShort])
def get_followers(user_id: int, skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from follows.crud import get_followers
    follows = get_followers(db, user_id, skip, limit)
    return [crud.get_user(db, f.follower_id) for f in follows]


@router.get("/{user_id}/following", response_model=list[schemas.UserShort])
def get_following(user_id: int, skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from follows.crud import get_following
    follows = get_following(db, user_id, skip, limit)
    return [crud.get_user(db, f.following_id) for f in follows]