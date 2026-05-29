from sqlalchemy.orm import Session
from follows.models import Follow


def get_follow(db: Session, follower_id: int, following_id: int):
    return db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == following_id
    ).first()


def get_followers(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(Follow).filter(
        Follow.following_id == user_id,
        Follow.status == "accepted"
    ).offset(skip).limit(limit).all()


def get_following(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.status == "accepted"
    ).offset(skip).limit(limit).all()


def get_followers_count(db: Session, user_id: int):
    return db.query(Follow).filter(
        Follow.following_id == user_id,
        Follow.status == "accepted"
    ).count()


def get_following_count(db: Session, user_id: int):
    return db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.status == "accepted"
    ).count()


def get_following_ids(db: Session, user_id: int):
    follows = db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.status == "accepted"
    ).all()
    return [f.following_id for f in follows]


def get_pending_requests(db: Session, user_id: int):
    return db.query(Follow).filter(
        Follow.following_id == user_id,
        Follow.status == "pending"
    ).all()


def follow_user(db: Session, follower_id: int, following_id: int, is_private: bool):
    existing = get_follow(db, follower_id, following_id)
    if existing:
        return existing
    status = "pending" if is_private else "accepted"
    db_follow = Follow(
        follower_id=follower_id,
        following_id=following_id,
        status=status
    )
    db.add(db_follow)
    db.commit()
    db.refresh(db_follow)
    return db_follow


def accept_follow(db: Session, follower_id: int, following_id: int):
    db_follow = get_follow(db, follower_id, following_id)
    if db_follow:
        db_follow.status = "accepted"
        db.commit()
        db.refresh(db_follow)
    return db_follow


def reject_follow(db: Session, follower_id: int, following_id: int):
    db_follow = get_follow(db, follower_id, following_id)
    if db_follow:
        db.delete(db_follow)
        db.commit()


def unfollow_user(db: Session, follower_id: int, following_id: int):
    db_follow = get_follow(db, follower_id, following_id)
    if db_follow:
        db.delete(db_follow)
        db.commit()


def is_accepted_follower(db: Session, follower_id: int, following_id: int) -> bool:
    return db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == following_id,
        Follow.status == "accepted"
    ).first() is not None