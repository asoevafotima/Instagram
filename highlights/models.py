from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    cover = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class HighlightStory(Base):
    __tablename__ = "highlight_stories"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    highlight_id = Column(Integer, ForeignKey("highlights.id"), nullable=False)
    story_id = Column(Integer, ForeignKey("stories.id"), nullable=False)
