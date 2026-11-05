from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    username: str
    password: str

class UserRead(BaseModel):
    id: int
    full_name: str
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: str = Field(min_length=6)
    role: str = "volunteer"  # "admin" or "volunteer"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
