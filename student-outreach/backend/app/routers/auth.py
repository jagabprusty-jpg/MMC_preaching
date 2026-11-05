from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import Session, select

from app.database import get_session
from app.config import settings
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserRead,
    ChangePasswordRequest,
    UserCreate,
    UserUpdate
)
from app.dependencies import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user,
    require_admin
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_session)
):
    """Authenticate user with username and password, returning JWT."""
    username = payload.username.strip()
    user = db.exec(select(User).where(User.username == username)).first()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Contact an administrator."
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Also set a secure HTTP-only cookie for browser sessions
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False  # Set to True if running under HTTPS in production
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserRead.model_validate(user)
    )

@router.post("/logout")
def logout(response: Response):
    """Clear session cookie and invalidate auth on client."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_active_user)):
    """Get the currently logged-in user profile."""
    return current_user

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Allow active user to securely change their password."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match"
        )
        
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
        
    current_user.password_hash = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password changed successfully"}

# User / Volunteer management endpoints (Admin only)

@router.get("/users", response_model=List[UserRead])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session)
):
    """Admin-only: List all users/volunteers in the system."""
    users = db.exec(select(User).order_by(User.id)).all()
    return users

@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session)
):
    """Admin-only: Create a new volunteer or administrator."""
    username = payload.username.strip().lower()
    existing = db.exec(select(User).where(User.username == username)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists"
        )
        
    new_user = User(
        full_name=payload.full_name.strip(),
        username=username,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role if payload.role in ["admin", "volunteer"] else "volunteer",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session)
):
    """Admin-only: Update user details or active status."""
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Prevent self-deactivation or role downgrade of primary admin
    if target_user.id == admin.id and payload.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own admin account"
        )
        
    if payload.full_name is not None:
        target_user.full_name = payload.full_name.strip()
    if payload.email is not None:
        target_user.email = payload.email
    if payload.role is not None and payload.role in ["admin", "volunteer"]:
        target_user.role = payload.role
    if payload.is_active is not None:
        target_user.is_active = payload.is_active
    if payload.password:
        target_user.password_hash = get_password_hash(payload.password)
        
    db.add(target_user)
    db.commit()
    db.refresh(target_user)
    return target_user
