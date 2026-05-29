from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from blocks import crud, schemas
from auth.crud import get_current_user
from users.crud import get_user
from users.schemas import UserShort
from users.models import User

router = APIRouter(prefix="/blocks", tags=["blocks"])


@router.post("/{user_id}", status_code=status.HTTP_201_CREATED)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")
    
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # если был подписан — отписываем
    from follows.crud import get_follow, unfollow_user
    if get_follow(db, current_user.id, user_id):
        unfollow_user(db, current_user.id, user_id)
    if get_follow(db, user_id, current_user.id):
        unfollow_user(db, user_id, current_user.id)
    
    crud.block_user(db, current_user.id, user_id)
    return {"detail": "User blocked"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    block = crud.get_block(db, current_user.id, user_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    crud.unblock_user(db, current_user.id, user_id)


@router.get("/", response_model=list[UserShort])
def get_blocked_users(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    blocks = crud.get_blocked_users(db, current_user.id, skip, limit)
    return [get_user(db, b.blocked_id) for b in blocks]


@router.get("/{user_id}/status")
def is_blocked(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = get_user(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    blocked_by_me = crud.is_blocked(db, current_user.id, user_id)
    blocked_by_them = crud.is_blocked(db, user_id, current_user.id)
    
    return {
        "blocked_by_me": blocked_by_me,
        "blocked_by_them": blocked_by_them
    }