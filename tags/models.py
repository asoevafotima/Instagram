from sqlalchemy import Column, BigInteger, String, Integer, ForeignKey
from database import Base

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String, unique=True, nullable=False)
    count = Column(Integer, default=0)


class PostTag(Base):
    __tablename__ = "post_tags"

    post_id = Column(BigInteger, ForeignKey("posts.id"), primary_key=True)
    tag_id = Column(BigInteger, ForeignKey("tags.id"), primary_key=True)