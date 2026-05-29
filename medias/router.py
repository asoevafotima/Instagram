from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from medias import crud, schemas
from auth.crud import get_current_user
from posts.crud import get_post
from users.models import User

router = APIRouter(prefix="/medias", tags=["medias"])


@router.get("/post/{post_id}", response_model=list[schemas.MediaResponse])
def get_post_medias(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return crud.get_post_medias(db, post_id)


@router.post("/post/{post_id}", response_model=schemas.MediaResponse, status_code=status.HTTP_201_CREATED)
def add_media(
    post_id: int,
    data: schemas.MediaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    return crud.create_media(db, post_id, data)


@router.get("/{media_id}", response_model=schemas.MediaResponse)
def get_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    media = crud.get_media(db, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return media


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    media = crud.get_media(db, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    post = get_post(db, media.post_id)
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    crud.delete_media(db, media_id)