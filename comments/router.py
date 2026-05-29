from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from comments import crud, schemas
from auth.crud import get_current_user
from posts.crud import get_post
from users.crud import get_user
from users.schemas import UserShort
from notifications.crud import create_notification
from users.models import User

router = APIRouter(prefix="/comments", tags=["comments"])


@router.post("/post/{post_id}", response_model=schemas.CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    data: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if data.parent_id:
        parent = crud.get_comment(db, data.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    comment = crud.create_comment(db, current_user.id, post_id, data)
    
    if post.user_id != current_user.id:
        create_notification(
            db,
            to_user_id=post.user_id,
            from_user_id=current_user.id,
            type="comment",
            entity_id=comment.id
        )
    
    return {
        "id": comment.id,
        "user": get_user(db, comment.user_id),
        "post_id": comment.post_id,
        "parent_id": comment.parent_id,
        "text": comment.text,
        "likes_count": crud.get_comment_likes_count(db, comment.id),
        "replies_count": 0,
        "is_liked": crud.get_comment_like(db, comment.id, current_user.id) is not None,
        "created_at": comment.created_at
    }


@router.get("/post/{post_id}", response_model=list[schemas.CommentResponse])
def get_post_comments(
    post_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = crud.get_post_comments(db, post_id, skip, limit)
    return [
        {
            "id": c.id,
            "user": get_user(db, c.user_id),
            "post_id": c.post_id,
            "parent_id": c.parent_id,
            "text": c.text,
            "likes_count": crud.get_comment_likes_count(db, c.id),
            "replies_count": len(crud.get_comment_replies(db, c.id)),
            "is_liked": crud.get_comment_like(db, c.id, current_user.id) is not None,
            "created_at": c.created_at
        }
        for c in comments
    ]


@router.get("/{comment_id}/replies", response_model=list[schemas.CommentResponse])
def get_comment_replies(
    comment_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = crud.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    replies = crud.get_comment_replies(db, comment_id, skip, limit)
    return [
        {
            "id": r.id,
            "user": get_user(db, r.user_id),
            "post_id": r.post_id,
            "parent_id": r.parent_id,
            "text": r.text,
            "likes_count": crud.get_comment_likes_count(db, r.id),
            "replies_count": 0,
            "is_liked": crud.get_comment_like(db, r.id, current_user.id) is not None,
            "created_at": r.created_at
        }
        for r in replies
    ]


@router.put("/{comment_id}", response_model=schemas.CommentResponse)
def update_comment(
    comment_id: int,
    data: schemas.CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = crud.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your comment")
    comment = crud.update_comment(db, comment_id, data)
    return {
        "id": comment.id,
        "user": get_user(db, comment.user_id),
        "post_id": comment.post_id,
        "parent_id": comment.parent_id,
        "text": comment.text,
        "likes_count": crud.get_comment_likes_count(db, comment.id),
        "replies_count": len(crud.get_comment_replies(db, comment.id)),
        "is_liked": crud.get_comment_like(db, comment.id, current_user.id) is not None,
        "created_at": comment.created_at
    }


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = crud.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your comment")
    crud.delete_comment(db, comment_id)


@router.post("/{comment_id}/like", status_code=status.HTTP_201_CREATED)
def like_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = crud.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    crud.like_comment(db, comment_id, current_user.id)
    return {"detail": "Liked"}


@router.delete("/{comment_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def unlike_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = crud.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    crud.unlike_comment(db, comment_id, current_user.id)