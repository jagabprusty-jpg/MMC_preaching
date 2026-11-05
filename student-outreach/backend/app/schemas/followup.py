from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class FollowupCreate(BaseModel):
    student_id: int
    contact_date: Optional[datetime] = None
    contact_status: str = Field(pattern=r"^(contacted|not_reachable|interested|not_interested)$")
    notes: str = Field(min_length=1, max_length=1000)
    next_followup_date: Optional[str] = None  # YYYY-MM-DD
    update_student_status: Optional[str] = None  # Optional status update for the student

class FollowupUpdate(BaseModel):
    contact_status: Optional[str] = Field(default=None, pattern=r"^(contacted|not_reachable|interested|not_interested)$")
    notes: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    next_followup_date: Optional[str] = None

class FollowupRead(BaseModel):
    id: int
    student_id: int
    contact_date: datetime
    contact_status: str
    notes: str
    next_followup_date: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    student_name: Optional[str] = None
    student_registration_number: Optional[str] = None
    student_phone_number: Optional[str] = None
    student_room_number: Optional[str] = None
    student_hostel_name: Optional[str] = None
    student_status: Optional[str] = None
    consent_to_contact: Optional[bool] = None

    class Config:
        from_attributes = True

class FollowupListResponse(BaseModel):
    items: List[FollowupRead]
    total: int
