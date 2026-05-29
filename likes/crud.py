from sqlalchemy.orm import Session
from likes.models import Like


def get_like(db: Session, user_id: int, post_id: int):
    return db.query(Like).filter(
        Like.user_id == user_id,
        Like.post_id == post_id
    ).first()


def get_post_likes(db: Session, post_id: int, skip: int = 0, limit: int = 20):
    return db.query(Like).filter(
        Like.post_id == post_id
    ).offset(skip).limit(limit).all()


def get_post_likes_count(db: Session, post_id: int):
    return db.query(Like).filter(Like.post_id == post_id).count()


def like_post(db: Session, user_id: int, post_id: int):
    existing = get_like(db, user_id, post_id)
    if existing:
        return existing
    db_like = Like(user_id=user_id, post_id=post_id)
    db.add(db_like)
    db.commit()
    db.refresh(db_like)
    return db_like


def unlike_post(db: Session, user_id: int, post_id: int):
    db_like = get_like(db, user_id, post_id)
    if db_like:
        db.delete(db_like)
        db.commit()