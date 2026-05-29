from sqlalchemy.orm import Session
from chats.models import Chat, Member


def get_chat(db: Session, chat_id: int):
    return db.query(Chat).filter(Chat.id == chat_id).first()


def get_user_chats(db: Session, user_id: int):
    members = db.query(Member).filter(
        Member.user_id == user_id
    ).all()
    chat_ids = [m.chat_id for m in members]
    return db.query(Chat).filter(
        Chat.id.in_(chat_ids)
    ).order_by(Chat.created_at.desc()).all()


def get_chat_members(db: Session, chat_id: int):
    return db.query(Member).filter(
        Member.chat_id == chat_id
    ).all()


def get_member(db: Session, chat_id: int, user_id: int):
    return db.query(Member).filter(
        Member.chat_id == chat_id,
        Member.user_id == user_id
    ).first()


def is_member(db: Session, chat_id: int, user_id: int):
    return get_member(db, chat_id, user_id) is not None


def create_chat(db: Session, owner_id: int, is_group: bool, name: str = None, photo: str = None):
    db_chat = Chat(
        owner_id=owner_id,
        is_group=is_group,
        name=name,
        photo=photo
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    add_member(db, db_chat.id, owner_id, role="admin")
    return db_chat


def add_member(db: Session, chat_id: int, user_id: int, role: str = "member"):
    existing = get_member(db, chat_id, user_id)
    if existing:
        return existing
    db_member = Member(
        chat_id=chat_id,
        user_id=user_id,
        role=role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


def remove_member(db: Session, chat_id: int, user_id: int):
    db_member = get_member(db, chat_id, user_id)
    if db_member:
        db.delete(db_member)
        db.commit()


def update_chat(db: Session, chat_id: int, name: str = None, photo: str = None):
    db_chat = get_chat(db, chat_id)
    if name:
        db_chat.name = name
    if photo:
        db_chat.photo = photo
    db.commit()
    db.refresh(db_chat)
    return db_chat


def delete_chat(db: Session, chat_id: int):
    db_chat = get_chat(db, chat_id)
    db.delete(db_chat)
    db.commit()


def get_or_create_direct_chat(db: Session, user1_id: int, user2_id: int):
    user1_chats = db.query(Member).filter(Member.user_id == user1_id).all()
    user1_chat_ids = [m.chat_id for m in user1_chats]

    user2_chats = db.query(Member).filter(Member.user_id == user2_id).all()
    user2_chat_ids = [m.chat_id for m in user2_chats]

    common_chat_ids = set(user1_chat_ids) & set(user2_chat_ids)

    for chat_id in common_chat_ids:
        chat = get_chat(db, chat_id)
        if chat and not chat.is_group:
            return chat

    chat = create_chat(db, owner_id=user1_id, is_group=False)
    add_member(db, chat.id, user2_id)
    return chat