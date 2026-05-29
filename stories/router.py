from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from stories import crud, schemas
from auth.crud import get_current_user
from follows.crud import get_following_ids, is_accepted_follower
from users.crud import get_user
from users.schemas import UserShort
from users.models import User

router = APIRouter(prefix="/stories", tags=["stories"])


def build_story_response(db, story, current_user_id: int = None):
    user = get_user(db, story.user_id)
    views = crud.get_story_views(db, story.id)
    views_count = len(views)
    is_viewed = any(v.user_id == current_user_id for v in views) if current_user_id else False
    reactions = crud.get_story_reactions(db, story.id)
    is_liked = any(r.user_id == current_user_id and r.emoji == "❤️" for r in reactions) if current_user_id else False
    return {
        "id": story.id,
        "user": UserShort.model_validate(user),
        "url": story.url,
        "type": story.type,
        "expires_at": story.expires_at,
        "created_at": story.created_at,
        "views_count": views_count,
        "is_viewed": is_viewed,
        "has_unviewed": not is_viewed,
        "is_liked": is_liked,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_story(
    data: schemas.StoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = crud.create_story(db, current_user.id, data)
    return build_story_response(db, story, current_user.id)


@router.get("/feed")
def get_feed_stories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    following_ids = get_following_ids(db, current_user.id)
    following_ids.append(current_user.id)
    stories = crud.get_feed_stories(db, following_ids)
    return [build_story_response(db, story, current_user.id) for story in stories]


@router.get("/user/{user_id}")
def get_user_stories(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target = get_user(db, user_id)
    if target and target.is_private and target.id != current_user.id:
        if not is_accepted_follower(db, current_user.id, target.id):
            raise HTTPException(status_code=403, detail="This account is private")
    stories = crud.get_user_stories(db, user_id)
    return [build_story_response(db, story, current_user.id) for story in stories]


@router.get("/{story_id}")
def get_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = crud.get_story(db, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return build_story_response(db, story, current_user.id)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = crud.get_story(db, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your story")
    crud.delete_story(db, story_id)


@router.post("/{story_id}/view")
def view_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = crud.get_story(db, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    view = crud.view_story(db, story_id, current_user.id)
    return {
        "id": view.id,
        "user": UserShort.model_validate(get_user(db, view.user_id)),
        "viewed_at": view.viewed_at
    }


@router.get("/{story_id}/views")
def get_story_views(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = crud.get_story(db, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your story")
    views = crud.get_story_views(db, story_id)
    return [{"id": v.id, "user": UserShort.model_validate(get_user(db, v.user_id)), "viewed_at": v.viewed_at} for v in views]


@router.post("/{story_id}/react")
def react_to_story(
    story_id: int,
    data: schemas.StoryReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = crud.get_story(db, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    reaction = crud.react_story(db, story_id, current_user.id, data)
    return {
        "id": reaction.id,
        "user": UserShort.model_validate(get_user(db, reaction.user_id)),
        "emoji": reaction.emoji,
        "created_at": reaction.created_at
    }


@router.delete("/{story_id}/react", status_code=status.HTTP_204_NO_CONTENT)
def unreact_to_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from stories.models import StoryReaction
    db.query(StoryReaction).filter(
        StoryReaction.story_id == story_id,
        StoryReaction.user_id == current_user.id
    ).delete()
    db.commit()


@router.get("/{story_id}/reactions")
def get_story_reactions(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = crud.get_story(db, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your story")
    reactions = crud.get_story_reactions(db, story_id)
    return [{"id": r.id, "user": UserShort.model_validate(get_user(db, r.user_id)), "emoji": r.emoji, "created_at": r.created_at} for r in reactions]