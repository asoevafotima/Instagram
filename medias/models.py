from sqlalchemy import Column, BigInteger, String, Integer, ForeignKey, Integer
from database import Base

class Media(Base):
    __tablename__ = "medias"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    post_id = Column(BigInteger, ForeignKey("posts.id"), nullable=False)
    url = Column(String, nullable=False)
    type = Column(String, nullable=False) 
    order = Column(Integer, default=0)