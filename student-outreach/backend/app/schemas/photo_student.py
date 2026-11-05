from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class PhotoStudentRead(BaseModel):
    id: int
    name: str
    phone_number: str
    photo_url: str
    notes: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PhotoStudentListResponse(BaseModel):
    items: List[PhotoStudentRead]
    total: int
    page: int
    limit: int
    total_pages: int

class PhotoStudentUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    notes: Optional[str] = None
