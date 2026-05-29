from pydantic import BaseModel
from datetime import datetime
from posts.schemas import PostResponse


class SavedCreate(BaseModel):
    post_id: int


class SavedResponse(BaseModel):
    id: int
    post: PostResponse
    created_at: datetime

    class Config:
        from_attributes = True
        