from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
from chats import crud, schemas
from messages.crud import get_chat_messages, create_message, get_unread_count, mark_all_read, get_last_message
from auth.crud import get_current_user
from users.crud import get_user
from users.schemas import UserShort
from users.models import User
from typing import Dict, List, Set, Optional
from datetime import datetime
import json

router = APIRouter(prefix="/chats", tags=["chats"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.ws_to_user: Dict[WebSocket, int] = {}
        self.online_users: Set[int] = set()
        self.last_seen: Dict[int, str] = {}

    async def connect(self, websocket: WebSocket, chat_id: int, user_id: int):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)
        self.ws_to_user[websocket] = user_id
        self.online_users.add(user_id)

    def disconnect(self, websocket: WebSocket, chat_id: int) -> Optional[int]:
        if chat_id in self.active_connections:
            try:
                self.active_connections[chat_id].remove(websocket)
            except ValueError:
                pass
        user_id = self.ws_to_user.pop(websocket, None)
        if user_id and user_id not in self.ws_to_user.values():
            self.online_users.discard(user_id)
            self.last_seen[user_id] = datetime.utcnow().isoformat()
        return user_id

    def is_online(self, user_id: int) -> bool:
        return user_id in self.online_users

    def get_last_seen(self, user_id: int) -> Optional[str]:
        return self.last_seen.get(user_id)

    async def broadcast(self, chat_id: int, message: dict):
        if chat_id in self.active_connections:
            dead = []
            for connection in self.active_connections[chat_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead.append(connection)
            for d in dead:
                self.disconnect(d, chat_id)


manager = ConnectionManager()


def build_chat_response(db, chat, current_user_id: int):
    owner = get_user(db, chat.owner_id)
    members = crud.get_chat_members(db, chat.id)
    last_msg = get_last_message(db, chat.id)
    unread = get_unread_count(db, chat.id, current_user_id)

    if not chat.is_group:
        other_member = next(
            (m for m in members if m.user_id != current_user_id), None
        )
        if other_member:
            comp_user = get_user(db, other_member.user_id)
            companion = {
                "id": comp_user.id,
                "username": comp_user.username,
                "full_name": comp_user.full_name,
                "photo": comp_user.photo,
                "is_private": comp_user.is_private,
                "is_online": manager.is_online(comp_user.id),
                "last_seen_at": manager.get_last_seen(comp_user.id),
            }
        else:
            companion = None
    else:
        companion = None

    return {
        "id": chat.id,
        "is_group": chat.is_group,
        "name": chat.name,
        "photo": chat.photo,
        "owner_id": chat.owner_id,
        "owner": UserShort.model_validate(owner).model_dump(),
        "companion": companion,
        "members_count": len(members),
        "last_message": last_msg.text if last_msg else None,
        "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
        "unread_count": unread,
        "created_at": chat.created_at
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_chat(
    data: schemas.ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not data.is_group and len(data.member_ids) == 1:
        chat = crud.get_or_create_direct_chat(db, current_user.id, data.member_ids[0])
    else:
        chat = crud.create_chat(
            db,
            owner_id=current_user.id,
            is_group=data.is_group,
            name=data.name,
            photo=data.photo
        )
        for member_id in data.member_ids:
            if member_id != current_user.id:
                crud.add_member(db, chat.id, member_id)

    return build_chat_response(db, chat, current_user.id)


@router.get("/")
def get_my_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chats = crud.get_user_chats(db, current_user.id)
    return [build_chat_response(db, chat, current_user.id) for chat in chats]


@router.get("/{chat_id}")
def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not crud.is_member(db, chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    return build_chat_response(db, chat, current_user.id)


@router.put("/{chat_id}")
def update_chat(
    chat_id: int,
    data: schemas.ChatUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner")
    chat = crud.update_chat(db, chat_id, data.name, data.photo)
    return build_chat_response(db, chat, current_user.id)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner")
    crud.delete_chat(db, chat_id)


@router.post("/{chat_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
def add_member(
    chat_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner")
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    crud.add_member(db, chat_id, user_id)
    return {"detail": "Member added"}


@router.delete("/{chat_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    chat_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.owner_id != current_user.id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    crud.remove_member(db, chat_id, user_id)


@router.get("/{chat_id}/members")
def get_members(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not crud.is_member(db, chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    members = crud.get_chat_members(db, chat_id)
    return [
        {
            "id": m.id,
            "user": UserShort.model_validate(get_user(db, m.user_id)),
            "role": m.role,
            "joined_at": m.joined_at,
        }
        for m in members
    ]


@router.put("/{chat_id}/members/{user_id}/role")
def update_member_role(
    chat_id: int,
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can change roles")
    member = crud.get_member(db, chat_id, user_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    role = data.get("role", "member")
    if role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be admin or member")
    member.role = role
    db.commit()
    return {"detail": "Role updated", "role": role}


@router.get("/{chat_id}/messages")
def get_messages(
    chat_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not crud.is_member(db, chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    messages = get_chat_messages(db, chat_id, skip, limit)
    return [
        {
            "id": m.id,
            "chat_id": m.chat_id,
            "user": UserShort.model_validate(get_user(db, m.user_id)),
            "text": m.text,
            "media_url": m.media_url,
            "reply_id": m.reply_id,
            "created_at": m.created_at,
        }
        for m in reversed(messages)
    ]


@router.get("/{chat_id}/unread")
def get_chat_unread(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = crud.get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not crud.is_member(db, chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    count = get_unread_count(db, chat_id, current_user.id)
    return {"unread_count": count}


@router.websocket("/{chat_id}/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_id: int,
    user_id: int,
    token: str = None,
):
    from database import SessionLocal
    from jose import jwt
    from auth.crud import SECRET_KEY, ALGORITHM

    db = SessionLocal()
    try:
        if not token:
            await websocket.close(code=4001)
            return
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        auth_user_id = int(payload.get("sub"))
        if auth_user_id != user_id:
            await websocket.close(code=4003)
            return
        if not crud.is_member(db, chat_id, user_id):
            await websocket.close(code=4003)
            return

        await manager.connect(websocket, chat_id, user_id)
        await manager.broadcast(chat_id, {"type": "presence", "user_id": user_id, "online": True})
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg_data = json.loads(data)
                except Exception:
                    continue

                if msg_data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

                elif msg_data.get("type") == "message":
                    text = (msg_data.get("text") or "").strip()
                    media_url = msg_data.get("media_url")
                    if not text and not media_url:
                        continue
                    message = create_message(
                        db,
                        chat_id=chat_id,
                        user_id=user_id,
                        text=text or None,
                        media_url=media_url,
                        reply_id=msg_data.get("reply_id"),
                    )
                    response = {
                        "type": "message",
                        "message": {
                            "id": message.id,
                            "chat_id": message.chat_id,
                            "user": UserShort.model_validate(get_user(db, message.user_id)).model_dump(),
                            "text": message.text,
                            "media_url": message.media_url,
                            "reply_id": message.reply_id,
                            "created_at": message.created_at.isoformat(),
                        },
                    }
                    await manager.broadcast(chat_id, response)

                elif msg_data.get("type") in ("call_offer", "call_answer", "call_ice", "call_end", "call_busy"):
                    msg_data["from_user_id"] = user_id
                    await manager.broadcast(chat_id, msg_data)

        except WebSocketDisconnect:
            manager.disconnect(websocket, chat_id)
            await manager.broadcast(chat_id, {"type": "presence", "user_id": user_id, "online": False})
    finally:
        db.close()