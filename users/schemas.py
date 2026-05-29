from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    phone: str
    password: str
    full_name: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    photo: str | None = None
    is_private: bool | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: str
    full_name: str | None
    bio: str | None
    photo: str | None
    is_private: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserShort(BaseModel):
    id: int
    username: str
    photo: str | None
    full_name: str | None
    is_verified: bool

    class Config:
        from_attributes = True

