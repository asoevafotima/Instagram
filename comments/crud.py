from sqlalchemy.orm import Session
from comments.models import Comment, CommentLike
from comments.schemas import CommentCreate, CommentUpdate


def get_comment(db: Session, comment_id: int):
    return db.query(Comment).filter(Comment.id == comment_id).first()


def get_post_comments(db: Session, post_id: int, skip: int = 0, limit: int = 20):
    return db.query(Comment).filter(
        Comment.post_id == post_id,
        Comment.parent_id == None
    ).order_by(Comment.created_at.desc()).offset(skip).limit(limit).all()


def get_comment_replies(db: Session, comment_id: int, skip: int = 0, limit: int = 10):
    return db.query(Comment).filter(
        Comment.parent_id == comment_id
    ).order_by(Comment.created_at.asc()).offset(skip).limit(limit).all()


def get_post_comments_count(db: Session, post_id: int):
    return db.query(Comment).filter(Comment.post_id == post_id).count()


def create_comment(db: Session, user_id: int, post_id: int, data: CommentCreate):
    db_comment = Comment(
        user_id=user_id,
        post_id=post_id,
        text=data.text,
        parent_id=data.parent_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


def update_comment(db: Session, comment_id: int, data: CommentUpdate):
    db_comment = get_comment(db, comment_id)
    db_comment.text = data.text
    db.commit()
    db.refresh(db_comment)
    return db_comment


def delete_comment(db: Session, comment_id: int):
    db_comment = get_comment(db, comment_id)
    db.delete(db_comment)
    db.commit()


def get_comment_like(db: Session, comment_id: int, user_id: int):
    return db.query(CommentLike).filter(
        CommentLike.comment_id == comment_id,
        CommentLike.user_id == user_id
    ).first()


def get_comment_likes_count(db: Session, comment_id: int):
    return db.query(CommentLike).filter(
        CommentLike.comment_id == comment_id
    ).count()


def like_comment(db: Session, comment_id: int, user_id: int):
    existing = get_comment_like(db, comment_id, user_id)
    if existing:
        return existing
    db_like = CommentLike(comment_id=comment_id, user_id=user_id)
    db.add(db_like)
    db.commit()
    db.refresh(db_like)
    return db_like


def unlike_comment(db: Session, comment_id: int, user_id: int):
    db_like = get_comment_like(db, comment_id, user_id)
    if db_like:
        db.delete(db_like)
        db.commit()