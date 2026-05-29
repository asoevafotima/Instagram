from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class FollowCreate(BaseModel):
    following_id: int


class FollowResponse(BaseModel):
    id: int
    follower: UserShort
    following: UserShort
    status: str  
    created_at: datetime

    class Config:
        from_attributes = True


class FollowShort(BaseModel):
    id: int
    user: UserShort
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
