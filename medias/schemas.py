from pydantic import BaseModel


class MediaCreate(BaseModel):
    url: str
    type: str  
    order: int = 0


class MediaResponse(BaseModel):
    id: int
    post_id: int
    url: str
    type: str
    order: int

    class Config:
        from_attributes = True
