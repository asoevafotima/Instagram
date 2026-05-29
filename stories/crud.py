from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from stories.models import Story, StoryView, StoryReaction
from stories.schemas import StoryCreate, StoryReactionCreate


def get_story(db: Session, story_id: int):
    return db.query(Story).filter(Story.id == story_id).first()


def get_user_stories(db: Session, user_id: int):
    now = datetime.utcnow()
    return db.query(Story).filter(
        Story.user_id == user_id,
        Story.expires_at > now
    ).order_by(Story.created_at.desc()).all()


def get_feed_stories(db: Session, following_ids: list[int]):
    now = datetime.utcnow()
    return db.query(Story).filter(
        Story.user_id.in_(following_ids),
        Story.expires_at > now
    ).order_by(Story.created_at.desc()).all()


def create_story(db: Session, user_id: int, data: StoryCreate):
    db_story = Story(
        user_id=user_id,
        url=data.url,
        type=data.type,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story


def delete_story(db: Session, story_id: int):
    db_story = get_story(db, story_id)
    db.delete(db_story)
    db.commit()


def view_story(db: Session, story_id: int, user_id: int):
    existing = db.query(StoryView).filter(
        StoryView.story_id == story_id,
        StoryView.user_id == user_id
    ).first()
    if existing:
        return existing
    db_view = StoryView(story_id=story_id, user_id=user_id)
    db.add(db_view)
    db.commit()
    db.refresh(db_view)
    return db_view


def get_story_views(db: Session, story_id: int):
    return db.query(StoryView).filter(
        StoryView.story_id == story_id
    ).all()


def react_story(db: Session, story_id: int, user_id: int, data: StoryReactionCreate):
    existing = db.query(StoryReaction).filter(
        StoryReaction.story_id == story_id,
        StoryReaction.user_id == user_id
    ).first()
    if existing:
        existing.emoji = data.emoji
        db.commit()
        db.refresh(existing)
        return existing
    db_reaction = StoryReaction(
        story_id=story_id,
        user_id=user_id,
        emoji=data.emoji
    )
    db.add(db_reaction)
    db.commit()
    db.refresh(db_reaction)
    return db_reaction


def get_story_reactions(db: Session, story_id: int):
    return db.query(StoryReaction).filter(
        StoryReaction.story_id == story_id
    ).all()
