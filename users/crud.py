from sqlalchemy.orm import Session
from users.models import User
from users.schemas import UserUpdate
import bcrypt
import re


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s\-()]", "", phone.strip())
    if cleaned.startswith("8") and len(cleaned) == 11:
        cleaned = "+7" + cleaned[1:]
    elif not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    return cleaned


def get_user_by_phone(db: Session, phone: str):
    normalized = normalize_phone(phone)
    user = db.query(User).filter(User.phone == normalized).first()
    if user:
        return user
    digits = re.sub(r"\D", "", normalized)
    users = db.query(User).filter(User.phone.isnot(None)).all()
    for u in users:
        if u.phone and re.sub(r"\D", "", u.phone) == digits:
            return u
    return None


def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_users(db: Session, skip: int = 0, limit: int = 20):
    return db.query(User).offset(skip).limit(limit).all()


def search_users(db: Session, query: str):
    return db.query(User).filter(
        User.username.ilike(f"%{query}%")
        | User.full_name.ilike(f"%{query}%")
    ).limit(20).all()


def register_user(db: Session, username: str, phone: str, password: str):
    phone = normalize_phone(phone)
    username = username.strip().lower()

    if get_user_by_phone(db, phone):
        return None
    if get_user_by_username(db, username):
        return None

    email = f"{re.sub(r'\D', '', phone)}@example.com"
    db_user = User(
        username=username,
        email=email,
        phone=phone,
        password=hash_password(password),
        full_name=username,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, data: UserUpdate):
    db_user = get_user(db, user_id)
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    db.delete(db_user)
    db.commit()
