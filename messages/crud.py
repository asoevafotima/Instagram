from sqlalchemy.orm import Session
from messages.models import Message, Read


def get_message(db: Session, message_id: int):
    return db.query(Message).filter(Message.id == message_id).first()


def get_chat_messages(db: Session, chat_id: int, skip: int = 0, limit: int = 50):
    return db.query(Message).filter(
        Message.chat_id == chat_id
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()


def get_last_message(db: Session, chat_id: int):
    return db.query(Message).filter(
        Message.chat_id == chat_id
    ).order_by(Message.created_at.desc()).first()


def create_message(db: Session, chat_id: int, user_id: int, text: str = None, media_url: str = None, reply_id: int = None):
    db_message = Message(
        chat_id=chat_id,
        user_id=user_id,
        text=text,
        media_url=media_url,
        reply_id=reply_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def update_message(db: Session, message_id: int, text: str):
    db_message = get_message(db, message_id)
    db_message.text = text
    db.commit()
    db.refresh(db_message)
    return db_message


def delete_message(db: Session, message_id: int):
    db_message = get_message(db, message_id)
    db.delete(db_message)
    db.commit()


def read_message(db: Session, message_id: int, user_id: int):
    existing = db.query(Read).filter(
        Read.message_id == message_id,
        Read.user_id == user_id
    ).first()
    if existing:
        return existing
    db_read = Read(message_id=message_id, user_id=user_id)
    db.add(db_read) 
    db.commit()
    db.refresh(db_read)
    return db_read


def get_unread_count(db: Session, chat_id: int, user_id: int):
    messages = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.user_id != user_id
    ).all()
    message_ids = [m.id for m in messages]
    read_ids = [r.message_id for r in db.query(Read).filter(
        Read.message_id.in_(message_ids),
        Read.user_id == user_id
    ).all()]
    return len(set(message_ids) - set(read_ids))


def mark_all_read(db: Session, chat_id: int, user_id: int):
    messages = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.user_id != user_id
    ).all()
    for message in messages:
        existing = db.query(Read).filter(
            Read.message_id == message.id,
            Read.user_id == user_id
        ).first()
        if not existing:
            db_read = Read(message_id=message.id, user_id=user_id)
            db.add(db_read)
    db.commit()