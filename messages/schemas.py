from pydantic import BaseModel
from datetime import datetime
from users.schemas import UserShort


class MessageCreate(BaseModel):
    text: str | None = None
    media_url: str | None = None
    reply_id: int | None = None


class MessageUpdate(BaseModel):
    text: str


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    user: UserShort
    reply_id: int | None
    text: str | None
    media_url: str | None
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class ReadResponse(BaseModel):
    id: int
    message_id: int
    user: UserShort
    read_at: datetime

    class Config:
        from_attributes = True
        