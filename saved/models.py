from sqlalchemy import Column, BigInteger, DateTime, ForeignKey,  Integer
from sqlalchemy.sql import func
from database import Base

class Saved(Base):
    __tablename__ = "saved"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    post_id = Column(BigInteger, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())