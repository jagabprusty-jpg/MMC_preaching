from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.attendance import Attendance
    from app.models.followup import Followup

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class StudentBase(SQLModel):
    name: str = Field(nullable=False, max_length=120)
    registration_number: str = Field(nullable=False, unique=True, index=True, max_length=50)
    room_number: str = Field(nullable=False, max_length=30)
    branch: str = Field(nullable=False, max_length=100)
    phone_number: str = Field(nullable=False, max_length=20)
    hostel_name: str = Field(nullable=False, max_length=100)
    interested: bool = Field(default=True)
    status: str = Field(default="new", max_length=30)  # "new", "interested", "regular", "inactive"
    consent_to_contact: bool = Field(default=True)

class Student(StudentBase, table=True):
    __tablename__ = "students"

    id: Optional[int] = Field(default=None, primary_key=True)
    registered_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    registered_by_user: Optional["User"] = Relationship(back_populates="students")
    attendances: List["Attendance"] = Relationship(
        back_populates="student",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    followups: List["Followup"] = Relationship(
        back_populates="student",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
