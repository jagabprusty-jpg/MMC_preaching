from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.session import Session
    from app.models.attendance import Attendance
    from app.models.followup import Followup

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class UserBase(SQLModel):
    full_name: str = Field(nullable=False, max_length=100)
    username: str = Field(nullable=False, unique=True, index=True, max_length=50)
    email: Optional[str] = Field(default=None, max_length=120)
    role: str = Field(default="volunteer", max_length=20)  # "admin" or "volunteer"
    is_active: bool = Field(default=True)

class User(UserBase, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    students: List["Student"] = Relationship(
        back_populates="registered_by_user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    sessions: List["Session"] = Relationship(
        back_populates="creator",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    attendances: List["Attendance"] = Relationship(back_populates="marker")
    followups: List["Followup"] = Relationship(back_populates="creator")
