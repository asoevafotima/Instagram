from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey , Integer
from sqlalchemy.sql import func
from database import Base

class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    url = Column(String, nullable=False)
    type = Column(String, nullable=False)  
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class StoryView(Base):
    __tablename__ = "story_views"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    story_id = Column(BigInteger, ForeignKey("stories.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    viewed_at = Column(DateTime, server_default=func.now())


class StoryReaction(Base):
    __tablename__ = "story_reactions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    story_id = Column(BigInteger, ForeignKey("stories.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())