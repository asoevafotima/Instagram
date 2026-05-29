from pydantic import BaseModel
from posts.schemas import PostShort


class TagResponse(BaseModel):
    id: int
    name: str
    count: int

    class Config:
        from_attributes = True


class TagWithPosts(BaseModel):
    id: int
    name: str
    count: int
    posts: list[PostShort] = []

    class Config:
        from_attributes = True


class PostTagCreate(BaseModel):
    tag_name: str