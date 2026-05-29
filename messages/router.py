from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from messages import crud, schemas
from auth.crud import get_current_user
from chats.crud import get_chat, is_member
from users.crud import get_user
from users.models import User

router = APIRouter(prefix="/messages", tags=["messages"])


def build_message_response(db, message):
    user = get_user(db, message.user_id)
    return {
        "id": message.id,
        "chat_id": message.chat_id,
        "user": user,
        "reply_id": message.reply_id,
        "text": message.text,
        "media_url": message.media_url,
        "created_at": message.created_at
    }


@router.post("/{chat_id}", status_code=status.HTTP_201_CREATED)
def send_message(
    chat_id: int,
    data: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not is_member(db, chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    
    if data.reply_id:
        reply = crud.get_message(db, data.reply_id)
        if not reply or reply.chat_id != chat_id:
            raise HTTPException(status_code=404, detail="Reply message not found")
    
    message = crud.create_message(
        db,
        chat_id=chat_id,
        user_id=current_user.id,
        text=data.text,
        media_url=data.media_url,
        reply_id=data.reply_id
    )
    return build_message_response(db, message)


@router.put("/{message_id}")
def update_message(
    message_id: int,
    data: schemas.MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = crud.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your message")
    message = crud.update_message(db, message_id, data.text)
    return build_message_response(db, message)


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = crud.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your message")
    crud.delete_message(db, message_id)


@router.post("/{message_id}/read", status_code=status.HTTP_200_OK)
def read_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = crud.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if not is_member(db, message.chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    if message.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot read your own message")
    crud.read_message(db, message_id, current_user.id)
    return {"detail": "Message marked as read"}


@router.post("/chat/{chat_id}/read-all", status_code=status.HTTP_200_OK)
def read_all_messages(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if not is_member(db, chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    crud.mark_all_read(db, chat_id, current_user.id)
    return {"detail": "All messages marked as read"}


@router.get("/{message_id}/reads", response_model=list[schemas.ReadResponse])
def get_message_reads(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = crud.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if not is_member(db, message.chat_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    from messages.models import Read
    reads = db.query(Read).filter(Read.message_id == message_id).all()
    return [
        {
            "id": r.id,
            "message_id": r.message_id,
            "user": get_user(db, r.user_id),
            "read_at": r.read_at
        }
        for r in reads
    ]