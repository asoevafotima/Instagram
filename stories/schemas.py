from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class StoryCreate(BaseModel):
    url: str
    type: str  # image, video


class StoryResponse(BaseModel):
    id: int
    user: UserShort
    url: str
    type: str
    expires_at: datetime
    created_at: datetime
    views_count: int = 0
    is_viewed: bool = False

    class Config:
        from_attributes = True


class StoryViewResponse(BaseModel):
    id: int
    user: UserShort
    viewed_at: datetime

    class Config:
        from_attributes = True


class StoryReactionCreate(BaseModel):
    emoji: str


class StoryReactionResponse(BaseModel):
    id: int
    user: UserShort
    emoji: str
    created_at: datetime

    class Config:
        from_attributes = True
        