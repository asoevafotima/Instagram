from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from posts import crud, schemas
from medias.crud import get_post_medias, create_media
from likes.crud import get_post_likes_count, get_like
from comments.crud import get_post_comments_count
from saved.crud import get_saved
from follows.crud import get_following_ids, is_accepted_follower
from auth.crud import get_current_user
from users.crud import get_user
from users.schemas import UserShort
from users.models import User

router = APIRouter(prefix="/posts", tags=["posts"])


def build_post_response(db, post, current_user_id: int = None):
    medias = get_post_medias(db, post.id)
    likes_count = get_post_likes_count(db, post.id)
    comments_count = get_post_comments_count(db, post.id)
    user = get_user(db, post.user_id)
    is_liked = bool(get_like(db, current_user_id, post.id)) if current_user_id else False
    is_saved = bool(get_saved(db, current_user_id, post.id)) if current_user_id else False
    return {
        "id": post.id,
        "user": UserShort.model_validate(user),
        "caption": post.caption,
        "type": post.type,
        "medias": medias,
        "likes_count": likes_count,
        "comments_count": comments_count,
        "is_liked": is_liked,
        "is_saved": is_saved,
        "created_at": post.created_at
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_post(
    data: schemas.PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = crud.create_post(db, current_user.id, data)
    return build_post_response(db, post, current_user.id)


@router.get("/feed")
def get_feed(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    following_ids = get_following_ids(db, current_user.id)
    posts = crud.get_feed(db, current_user.id, following_ids, skip, limit)
    return [build_post_response(db, post, current_user.id) for post in posts]


@router.get("/explore")
def get_explore(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    following_ids = get_following_ids(db, current_user.id)
    posts = crud.get_explore(db, following_ids, current_user.id, skip, limit)
    return [build_post_response(db, post, current_user.id) for post in posts]


@router.get("/user/{user_id}")
def get_user_posts(
    user_id: int,
    skip: int = 0,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target = get_user(db, user_id)
    if target and target.is_private and target.id != current_user.id:
        if not is_accepted_follower(db, current_user.id, target.id):
            raise HTTPException(status_code=403, detail="This account is private")
    posts = crud.get_user_posts(db, user_id, skip, limit)
    return [build_post_response(db, post, current_user.id) for post in posts]


@router.get("/{post_id}")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    owner = get_user(db, post.user_id)
    if owner and owner.is_private and owner.id != current_user.id:
        if not is_accepted_follower(db, current_user.id, owner.id):
            raise HTTPException(status_code=403, detail="This account is private")
    return build_post_response(db, post, current_user.id)


@router.put("/{post_id}")
def update_post(
    post_id: int,
    data: schemas.PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    post = crud.update_post(db, post_id, data)
    return build_post_response(db, post, current_user.id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    crud.delete_post(db, post_id)