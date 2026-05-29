from sqlalchemy.orm import Session
from posts.models import Post
from posts.schemas import PostCreate, PostUpdate


def get_post(db: Session, post_id: int):
    return db.query(Post).filter(Post.id == post_id).first()


def get_user_posts(db: Session, user_id: int, skip: int = 0, limit: int = 12):
    return db.query(Post).filter(
        Post.user_id == user_id
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()


def get_feed(db: Session, user_id: int, following_ids: list[int], skip: int = 0, limit: int = 20):
    feed_user_ids = list(set(following_ids + [user_id]))
    return db.query(Post).filter(
        Post.user_id.in_(feed_user_ids)
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()


def get_explore(db: Session, following_ids: list = None, current_user_id: int = None, skip: int = 0, limit: int = 20):
    from users.models import User
    query = db.query(Post).join(User, Post.user_id == User.id)
    allowed = list(following_ids or [])
    if current_user_id:
        allowed.append(current_user_id)
    query = query.filter(
        User.is_private.isnot(True) | Post.user_id.in_(allowed)
    )
    return query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()


def create_post(db: Session, user_id: int, data: PostCreate):
    db_post = Post(
        user_id=user_id,
        caption=data.caption,
        type=data.type
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


def update_post(db: Session, post_id: int, data: PostUpdate):
    db_post = get_post(db, post_id)
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(db_post, key, value)
    db.commit()
    db.refresh(db_post)
    return db_post


def delete_post(db: Session, post_id: int):
    db_post = get_post(db, post_id)
    db.delete(db_post)
    db.commit()
    