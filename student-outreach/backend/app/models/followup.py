from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.user import User

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class FollowupBase(SQLModel):
    student_id: int = Field(nullable=False, foreign_key="students.id", index=True)
    contact_date: datetime = Field(default_factory=get_utc_now, nullable=False)
    contact_status: str = Field(nullable=False, max_length=30)  # "contacted", "not_reachable", "interested", "not_interested"
    notes: str = Field(nullable=False, max_length=1000)
    next_followup_date: Optional[str] = Field(default=None, max_length=30)  # YYYY-MM-DD format

class Followup(FollowupBase, table=True):
    __tablename__ = "followups"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    student: Optional["Student"] = Relationship(back_populates="followups")
    creator: Optional["User"] = Relationship(back_populates="followups")
