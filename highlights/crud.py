from sqlalchemy.orm import Session
from highlights.models import Highlight, HighlightStory
from stories.models import Story


def get_highlight(db: Session, highlight_id: int):
    return db.query(Highlight).filter(Highlight.id == highlight_id).first()


def get_user_highlights(db: Session, user_id: int):
    return db.query(Highlight).filter(
        Highlight.user_id == user_id
    ).order_by(Highlight.created_at.desc()).all()


def create_highlight(db: Session, user_id: int, name: str, cover: str | None = None):
    db_highlight = Highlight(user_id=user_id, name=name, cover=cover)
    db.add(db_highlight)
    db.commit()
    db.refresh(db_highlight)
    return db_highlight


def update_highlight(db: Session, highlight_id: int, name: str | None = None, cover: str | None = None):
    db_highlight = get_highlight(db, highlight_id)
    if name is not None:
        db_highlight.name = name
    if cover is not None:
        db_highlight.cover = cover
    db.commit()
    db.refresh(db_highlight)
    return db_highlight


def delete_highlight(db: Session, highlight_id: int):
    db_highlight = get_highlight(db, highlight_id)
    db.query(HighlightStory).filter(HighlightStory.highlight_id == highlight_id).delete()
    db.delete(db_highlight)
    db.commit()


def add_story_to_highlight(db: Session, highlight_id: int, story_id: int):
    existing = db.query(HighlightStory).filter(
        HighlightStory.highlight_id == highlight_id,
        HighlightStory.story_id == story_id
    ).first()
    if existing:
        return existing
    db_item = HighlightStory(highlight_id=highlight_id, story_id=story_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def remove_story_from_highlight(db: Session, highlight_id: int, story_id: int):
    db_item = db.query(HighlightStory).filter(
        HighlightStory.highlight_id == highlight_id,
        HighlightStory.story_id == story_id
    ).first()
    if db_item:
        db.delete(db_item)
        db.commit()


def get_highlight_stories(db: Session, highlight_id: int):
    items = db.query(HighlightStory).filter(
        HighlightStory.highlight_id == highlight_id
    ).all()
    story_ids = [i.story_id for i in items]
    if not story_ids:
        return []
    return db.query(Story).filter(Story.id.in_(story_ids)).all()
