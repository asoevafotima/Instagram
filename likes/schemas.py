from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class LikeCreate(BaseModel):
    post_id: int


class LikeResponse(BaseModel):
    id: int
    user: UserShort
    post_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        