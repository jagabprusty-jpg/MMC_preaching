from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.attendance import Attendance

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class SessionBase(SQLModel):
    session_name: str = Field(nullable=False, max_length=150)
    session_date: str = Field(nullable=False, max_length=20)  # YYYY-MM-DD format
    start_time: str = Field(nullable=False, max_length=20)    # HH:MM format
    location: str = Field(nullable=False, max_length=150)
    description: Optional[str] = Field(default=None, max_length=500)

class Session(SessionBase, table=True):
    __tablename__ = "sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    creator: Optional["User"] = Relationship(back_populates="sessions")
    attendances: List["Attendance"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
