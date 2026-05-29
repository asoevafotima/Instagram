from sqlalchemy import Column, BigInteger, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from database import Base

class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    blocked_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())