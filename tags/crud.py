from sqlalchemy.orm import Session
from tags.models import Tag, PostTag


def get_tag(db: Session, tag_id: int):
    return db.query(Tag).filter(Tag.id == tag_id).first()


def get_tag_by_name(db: Session, name: str):
    return db.query(Tag).filter(Tag.name == name).first()


def get_popular_tags(db: Session, skip: int = 0, limit: int = 20):
    return db.query(Tag).order_by(
        Tag.count.desc()
    ).offset(skip).limit(limit).all()


def search_tags(db: Session, query: str):
    return db.query(Tag).filter(
        Tag.name.ilike(f"%{query}%")
    ).order_by(Tag.count.desc()).limit(20).all()


def get_post_tags(db: Session, post_id: int):
    return db.query(PostTag).filter(
        PostTag.post_id == post_id
    ).all()


def get_tag_posts(db: Session, tag_id: int, skip: int = 0, limit: int = 20):
    return db.query(PostTag).filter(
        PostTag.tag_id == tag_id
    ).offset(skip).limit(limit).all()


def create_tag(db: Session, name: str):
    db_tag = Tag(name=name, count=0)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


def add_tag_to_post(db: Session, post_id: int, tag_name: str):
    tag = get_tag_by_name(db, tag_name)
    if not tag:
        tag = create_tag(db, tag_name)
    existing = db.query(PostTag).filter(
        PostTag.post_id == post_id,
        PostTag.tag_id == tag.id
    ).first()
    if existing:
        return existing
    tag.count += 1
    db_post_tag = PostTag(post_id=post_id, tag_id=tag.id)
    db.add(db_post_tag)
    db.commit()
    return db_post_tag


def remove_tag_from_post(db: Session, post_id: int, tag_id: int):
    db_post_tag = db.query(PostTag).filter(
        PostTag.post_id == post_id,
        PostTag.tag_id == tag_id
    ).first()
    if db_post_tag:
        tag = get_tag(db, tag_id)
        if tag and tag.count > 0:
            tag.count -= 1
        db.delete(db_post_tag)
        db.commit()
        