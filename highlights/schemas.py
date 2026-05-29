from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class HighlightCreate(BaseModel):
    name: str
    cover: str | None = None


class HighlightUpdate(BaseModel):
    name: str | None = None
    cover: str | None = None


class StoryInHighlight(BaseModel):
    id: int
    url: str
    type: str
    created_at: datetime

    class Config:
        from_attributes = True


class HighlightResponse(BaseModel):
    id: int
    user: UserShort
    name: str
    cover: str | None
    stories: list[StoryInHighlight] = []
    created_at: datetime
