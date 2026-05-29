from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from tags import crud, schemas
from auth.crud import get_current_user
from posts.crud import get_post
from medias.crud import get_post_medias
from likes.crud import get_post_likes_count
from comments.crud import get_post_comments_count
from users.models import User

router = APIRouter(prefix="/tags", tags=["tags"])


def build_post_short(db, post_tag):
    from posts.crud import get_post
    post = get_post(db, post_tag.post_id)
    medias = get_post_medias(db, post.id)
    likes_count = get_post_likes_count(db, post.id)
    comments_count = get_post_comments_count(db, post.id)
    return {
        "id": post.id,
        "medias": medias,
        "likes_count": likes_count,
        "comments_count": comments_count
    }


@router.get("/popular", response_model=list[schemas.TagResponse])
def get_popular_tags(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud.get_popular_tags(db, skip, limit)


@router.get("/search", response_model=list[schemas.TagResponse])
def search_tags(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud.search_tags(db, q)


@router.get("/{tag_name}")
def get_tag(
    tag_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tag = crud.get_tag_by_name(db, tag_name)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {
        "id": tag.id,
        "name": tag.name,
        "count": tag.count
    }


@router.get("/{tag_name}/posts")
def get_tag_posts(
    tag_name: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tag = crud.get_tag_by_name(db, tag_name)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    post_tags = crud.get_tag_posts(db, tag.id, skip, limit)
    return [build_post_short(db, pt) for pt in post_tags]


@router.post("/post/{post_id}", status_code=status.HTTP_201_CREATED)
def add_tag_to_post(
    post_id: int,
    data: schemas.PostTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    crud.add_tag_to_post(db, post_id, data.tag_name)
    return {"detail": f"Tag #{data.tag_name} added"}


@router.delete("/post/{post_id}/{tag_name}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tag_from_post(
    post_id: int,
    tag_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    tag = crud.get_tag_by_name(db, tag_name)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    crud.remove_tag_from_post(db, post_id, tag.id)


@router.get("/post/{post_id}", response_model=list[schemas.TagResponse])
def get_post_tags(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post_tags = crud.get_post_tags(db, post_id)
    return [crud.get_tag(db, pt.tag_id) for pt in post_tags]
