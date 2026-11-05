from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class StudentBaseSchema(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    registration_number: str = Field(min_length=2, max_length=50)
    room_number: str = Field(min_length=1, max_length=30)
    branch: str = Field(min_length=2, max_length=100)
    phone_number: str = Field(min_length=5, max_length=20)
    hostel_name: str = Field(min_length=2, max_length=100)
    interested: bool = True
    status: str = Field(default="new")  # "new", "interested", "regular", "inactive"
    consent_to_contact: bool = True

class StudentCreate(StudentBaseSchema):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    registration_number: Optional[str] = None
    room_number: Optional[str] = None
    branch: Optional[str] = None
    phone_number: Optional[str] = None
    hostel_name: Optional[str] = None
    interested: Optional[bool] = None
    status: Optional[str] = None
    consent_to_contact: Optional[bool] = None

class StudentRead(StudentBaseSchema):
    id: int
    registered_by: Optional[int] = None
    registered_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    total_attended: int = 0
    total_sessions_recorded: int = 0
    attendance_rate: float = 0.0
    last_followup_status: Optional[str] = None
    last_followup_date: Optional[str] = None

    class Config:
        from_attributes = True

class StudentListResponse(BaseModel):
    items: List[StudentRead]
    total: int
    page: int
    limit: int
    total_pages: int
