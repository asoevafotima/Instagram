from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from database import Base

class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    follower_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    following_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="accepted")  
    created_at = Column(DateTime, server_default=func.now())
