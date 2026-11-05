from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class AttendanceRecordItem(BaseModel):
    student_id: int
    attendance_status: str = Field(pattern=r"^(present|absent)$")

class AttendanceBulkCreate(BaseModel):
    session_id: int
    records: List[AttendanceRecordItem]

class AttendanceSingleCreate(BaseModel):
    student_id: int
    session_id: int
    attendance_status: str = Field(pattern=r"^(present|absent)$")

class AttendanceUpdate(BaseModel):
    attendance_status: str = Field(pattern=r"^(present|absent)$")

class AttendanceRead(BaseModel):
    id: int
    student_id: int
    session_id: int
    attendance_status: str
    marked_by: Optional[int] = None
    marked_by_name: Optional[str] = None
    marked_at: datetime
    student_name: Optional[str] = None
    student_registration_number: Optional[str] = None
    student_room_number: Optional[str] = None
    student_branch: Optional[str] = None
    student_hostel_name: Optional[str] = None

    class Config:
        from_attributes = True

class SessionAttendanceResponse(BaseModel):
    session_id: int
    session_name: str
    session_date: str
    total_present: int
    total_absent: int
    total_marked: int
    records: List[AttendanceRead]

class StudentAttendanceStats(BaseModel):
    student_id: int
    student_name: str
    registration_number: str
    total_sessions_held: int
    sessions_attended: int
    sessions_absent: int
    attendance_rate: float
    records: List[AttendanceRead]
