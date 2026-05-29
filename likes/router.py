from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from likes import crud, schemas
from auth.crud import get_current_user
from posts.crud import get_post
from users.crud import get_user
from users.schemas import UserShort
from notifications.crud import create_notification
from users.models import User

router = APIRouter(prefix="/likes", tags=["likes"])


@router.post("/post/{post_id}", status_code=status.HTTP_201_CREATED)
def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    like = crud.like_post(db, current_user.id, post_id)
    if post.user_id != current_user.id:
        create_notification(
            db,
            to_user_id=post.user_id,
            from_user_id=current_user.id,
            type="like",
            entity_id=post_id
        )
    return {"detail": "Liked"}


@router.delete("/post/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    crud.unlike_post(db, current_user.id, post_id)


@router.get("/post/{post_id}")
def get_post_likes(
    post_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    count = crud.get_post_likes_count(db, post_id)
    likes = crud.get_post_likes(db, post_id, skip, limit)
    is_liked = crud.get_like(db, current_user.id, post_id) is not None
    return {
        "count": count,
        "users": [UserShort.model_validate(get_user(db, like.user_id)) for like in likes],
        "is_liked": is_liked,
    }


@router.get("/post/{post_id}/count")
def get_post_likes_count(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    count = crud.get_post_likes_count(db, post_id)
    return {"count": count}


@router.get("/post/{post_id}/users", response_model=list[UserShort])
def get_post_likers(
    post_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    likes = crud.get_post_likes(db, post_id, skip, limit)
    return [get_user(db, like.user_id) for like in likes]


@router.get("/post/{post_id}/me")
def is_liked(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    like = crud.get_like(db, current_user.id, post_id)
    return {"is_liked": like is not None}