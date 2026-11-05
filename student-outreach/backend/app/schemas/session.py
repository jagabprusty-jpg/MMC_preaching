from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class SessionBaseSchema(BaseModel):
    session_name: str = Field(min_length=2, max_length=150)
    session_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD
    start_time: str = Field(min_length=2, max_length=20)       # e.g., "18:00" or "06:00 PM"
    location: str = Field(min_length=2, max_length=150)
    description: Optional[str] = None

class SessionCreate(SessionBaseSchema):
    pass

class SessionUpdate(BaseModel):
    session_name: Optional[str] = None
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

class SessionRead(SessionBaseSchema):
    id: int
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime
    total_present: int = 0
    total_absent: int = 0
    total_marked: int = 0

    class Config:
        from_attributes = True

class SessionListResponse(BaseModel):
    items: List[SessionRead]
    total: int
