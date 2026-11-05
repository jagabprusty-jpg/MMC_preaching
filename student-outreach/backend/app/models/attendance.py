from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.session import Session
    from app.models.user import User

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class AttendanceBase(SQLModel):
    student_id: int = Field(nullable=False, foreign_key="students.id", index=True)
    session_id: int = Field(nullable=False, foreign_key="sessions.id", index=True)
    attendance_status: str = Field(nullable=False, max_length=20)  # "present" or "absent"

class Attendance(AttendanceBase, table=True):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("student_id", "session_id", name="unique_student_session"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    marked_by: Optional[int] = Field(default=None, foreign_key="users.id")
    marked_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    student: Optional["Student"] = Relationship(back_populates="attendances")
    session: Optional["Session"] = Relationship(back_populates="attendances")
    marker: Optional["User"] = Relationship(back_populates="attendances")
