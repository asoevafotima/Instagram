from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class CommentCreate(BaseModel):
    text: str
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    text: str


class CommentResponse(BaseModel):
    id: int
    user: UserShort
    post_id: int
    parent_id: int | None
    text: str
    likes_count: int = 0
    replies_count: int = 0
    is_liked: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class CommentLikeResponse(BaseModel):
    id: int
    user: UserShort
    comment_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        