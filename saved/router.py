from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from saved import crud, schemas
from auth.crud import get_current_user
from posts.crud import get_post
from medias.crud import get_post_medias
from likes.crud import get_post_likes_count
from comments.crud import get_post_comments_count
from users.crud import get_user
from users.models import User

router = APIRouter(prefix="/saved", tags=["saved"])


def build_saved_response(db, saved):
    post = get_post(db, saved.post_id)
    medias = get_post_medias(db, post.id)
    likes_count = get_post_likes_count(db, post.id)
    comments_count = get_post_comments_count(db, post.id)
    user = get_user(db, post.user_id)
    return {
        "id": saved.id,
        "post": {
            "id": post.id,
            "user": user,
            "caption": post.caption,
            "type": post.type,
            "medias": medias,
            "likes_count": likes_count,
            "comments_count": comments_count,
            "created_at": post.created_at
        },
        "created_at": saved.created_at
    }


@router.post("/{post_id}", status_code=status.HTTP_201_CREATED)
def save_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    crud.save_post(db, current_user.id, post_id)
    return {"detail": "Post saved"}


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    saved = crud.get_saved(db, current_user.id, post_id)
    if not saved:
        raise HTTPException(status_code=404, detail="Post not saved")
    
    crud.unsave_post(db, current_user.id, post_id)


@router.get("/", )
def get_saved_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    saved_posts = crud.get_saved_posts(db, current_user.id, skip, limit)
    return [build_saved_response(db, saved) for saved in saved_posts]


@router.get("/count")
def get_saved_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = crud.get_saved_count(db, current_user.id)
    return {"count": count}


@router.get("/{post_id}/status")
def is_saved(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    saved = crud.get_saved(db, current_user.id, post_id)
    return {"is_saved": saved is not None}
