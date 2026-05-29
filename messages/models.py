from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey , Integer
from sqlalchemy.sql import func
from database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    chat_id = Column(BigInteger, ForeignKey("chats.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    reply_id = Column(BigInteger, ForeignKey("messages.id"), nullable=True)
    text = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Read(Base):
    __tablename__ = "reads"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    message_id = Column(BigInteger, ForeignKey("messages.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime, server_default=func.now())