from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from auth import crud, schemas
from users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

bearer_scheme = HTTPBearer()


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(data: schemas.Register, db: Session = Depends(get_db)):
    user, error = crud.register(db, data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Registration failed",
        )
    return crud.create_token_pair(user.id)


@router.post("/login", response_model=schemas.Token)
def login(data: schemas.Login, db: Session = Depends(get_db)):
    result = crud.login(db, data)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone or password",
        )
    return result


@router.post("/refresh", response_model=schemas.Token)
def refresh(data: schemas.RefreshToken, db: Session = Depends(get_db)):
    from jose import jwt
    try:
        payload = jwt.decode(data.refresh_token, crud.SECRET_KEY, algorithms=[crud.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return crud.create_token_pair(user.id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(crud.get_current_user)):
    return {"detail": "Logged out successfully"}


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    data: schemas.ChangePassword,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    current_user = crud.get_current_user(credentials, db)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    from users.crud import verify_password, hash_password
    if not verify_password(data.old_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wrong old password")

    current_user.password = hash_password(data.new_password)
    db.commit()
    return {"detail": "Password changed successfully"}