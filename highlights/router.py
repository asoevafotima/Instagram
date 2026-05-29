from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from highlights import crud, schemas
from auth.crud import get_current_user
from users.crud import get_user
from users.schemas import UserShort
from users.models import User

router = APIRouter(prefix="/highlights", tags=["highlights"])


def build_highlight_response(db: Session, highlight):
    user = get_user(db, highlight.user_id)
    stories = crud.get_highlight_stories(db, highlight.id)
    return {
        "id": highlight.id,
        "user": UserShort.model_validate(user),
        "name": highlight.name,
        "cover": highlight.cover,
        "stories": [
            {"id": s.id, "url": s.url, "type": s.type, "created_at": s.created_at}
            for s in stories
        ],
        "created_at": highlight.created_at,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_highlight(
    data: schemas.HighlightCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    highlight = crud.create_highlight(db, current_user.id, data.name, data.cover)
    return build_highlight_response(db, highlight)


@router.get("/user/{user_id}")
def get_user_highlights(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    highlights = crud.get_user_highlights(db, user_id)
    return [build_highlight_response(db, h) for h in highlights]


@router.put("/{highlight_id}")
def update_highlight(
    highlight_id: int,
    data: schemas.HighlightUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    highlight = crud.get_highlight(db, highlight_id)
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if highlight.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your highlight")
    highlight = crud.update_highlight(db, highlight_id, data.name, data.cover)
    return build_highlight_response(db, highlight)


@router.delete("/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_highlight(
    highlight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    highlight = crud.get_highlight(db, highlight_id)
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if highlight.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your highlight")
    crud.delete_highlight(db, highlight_id)


@router.post("/{highlight_id}/stories/{story_id}", status_code=status.HTTP_201_CREATED)
def add_story(
    highlight_id: int,
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    highlight = crud.get_highlight(db, highlight_id)
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if highlight.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your highlight")
    crud.add_story_to_highlight(db, highlight_id, story_id)
    return {"detail": "Story added to highlight"}


@router.delete("/{highlight_id}/stories/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_story(
    highlight_id: int,
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    highlight = crud.get_highlight(db, highlight_id)
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if highlight.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your highlight")
    crud.remove_story_from_highlight(db, highlight_id, story_id)
