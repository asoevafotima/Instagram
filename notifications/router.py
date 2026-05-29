from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from notifications import crud, schemas
from auth.crud import get_current_user
from users.crud import get_user
from users.models import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

from users.schemas import UserShort

def build_notification_response(db, notification):
    from_user = get_user(db, notification.from_user_id)
    return {
        "id": notification.id,
        "from_user": UserShort.model_validate(from_user),
        "type": notification.type,
        "entity_id": notification.entity_id,
        "is_read": notification.is_read,
        "created_at": notification.created_at
    }


@router.get("/", )
def get_notifications(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = crud.get_user_notifications(db, current_user.id, skip, limit)
    return [build_notification_response(db, n) for n in notifications]


@router.get("/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = crud.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = crud.get_notification(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your notification")
    notification = crud.mark_as_read(db, notification_id)
    return build_notification_response(db, notification)


@router.put("/read/all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    crud.mark_all_as_read(db, current_user.id)
    return {"detail": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = crud.get_notification(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your notification")
    crud.delete_notification(db, notification_id)


@router.delete("/all", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    crud.delete_all_notifications(db, current_user.id)