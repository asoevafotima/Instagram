from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class ChatCreate(BaseModel):
    is_group: bool = False
    name: str | None = None
    photo: str | None = None
    member_ids: list[int]


class ChatUpdate(BaseModel):
    name: str | None = None
    photo: str | None = None


class ChatResponse(BaseModel):
    id: int
    is_group: bool
    name: str | None
    photo: str | None
    owner: UserShort
    companion: UserShort | None = None
    members_count: int = 0
    last_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class MemberResponse(BaseModel):
    id: int
    user: UserShort
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True