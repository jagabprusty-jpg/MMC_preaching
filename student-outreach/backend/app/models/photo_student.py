from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class PhotoStudentBase(SQLModel):
    name: str = Field(nullable=False, max_length=120)
    phone_number: str = Field(nullable=False, max_length=30)
    photo_url: str = Field(nullable=False, max_length=300)
    notes: Optional[str] = Field(default=None, max_length=500)

class PhotoStudent(PhotoStudentBase, table=True):
    __tablename__ = "photo_students"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    creator: Optional["User"] = Relationship()
