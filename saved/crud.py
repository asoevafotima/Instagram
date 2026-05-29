from sqlalchemy.orm import Session
from saved.models import Saved


def get_saved(db: Session, user_id: int, post_id: int):
    return db.query(Saved).filter(
        Saved.user_id == user_id,
        Saved.post_id == post_id
    ).first()


def get_saved_posts(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(Saved).filter(
        Saved.user_id == user_id
    ).order_by(Saved.created_at.desc()).offset(skip).limit(limit).all()


def get_saved_count(db: Session, user_id: int):
    return db.query(Saved).filter(
        Saved.user_id == user_id
    ).count()


def save_post(db: Session, user_id: int, post_id: int):
    existing = get_saved(db, user_id, post_id)
    if existing:
        return existing
    db_saved = Saved(user_id=user_id, post_id=post_id)
    db.add(db_saved)
    db.commit()
    db.refresh(db_saved)
    return db_saved


def unsave_post(db: Session, user_id: int, post_id: int):
    db_saved = get_saved(db, user_id, post_id)
    if db_saved:
        db.delete(db_saved)
        db.commit()
        