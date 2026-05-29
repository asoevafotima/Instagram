from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class MediaResponse(BaseModel):
    id: int
    url: str
    type: str
    order: int

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    caption: str | None = None
    type: str 

class PostUpdate(BaseModel):
    caption: str | None = None


class PostResponse(BaseModel):
    id: int
    user: UserShort
    caption: str | None
    type: str
    medias: list[MediaResponse] = []
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class PostShort(BaseModel):
    id: int
    medias: list[MediaResponse] = []
    likes_count: int = 0
    comments_count: int = 0

    class Config:
        from_attributes = True