from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlmodel import Session, select, func, col
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.session import Session as MeditationSession
from app.models.user import User
from app.schemas.attendance import (
    AttendanceRecordItem,
    AttendanceRead,
    SessionAttendanceResponse,
    StudentAttendanceStats
)

def mark_bulk_attendance(
    db: Session,
    session_id: int,
    records: List[AttendanceRecordItem],
    marked_by_user_id: int
) -> SessionAttendanceResponse:
    """Save or update attendance in bulk for a session."""
    med_session = db.get(MeditationSession, session_id)
    if not med_session:
        raise ValueError("Session not found")
        
    now_utc = datetime.now(timezone.utc)
    
    for item in records:
        student = db.get(Student, item.student_id)
        if not student:
            continue
            
        existing = db.exec(
            select(Attendance).where(
                Attendance.student_id == item.student_id,
                Attendance.session_id == session_id
            )
        ).first()
        
        if existing:
            existing.attendance_status = item.attendance_status
            existing.marked_by = marked_by_user_id
            existing.marked_at = now_utc
            db.add(existing)
        else:
            new_record = Attendance(
                student_id=item.student_id,
                session_id=session_id,
                attendance_status=item.attendance_status,
                marked_by=marked_by_user_id,
                marked_at=now_utc
            )
            db.add(new_record)
            
    db.commit()
    return get_session_attendance(db, session_id)

def get_session_attendance(db: Session, session_id: int) -> SessionAttendanceResponse:
    """Retrieve full attendance list and counts for a specific session."""
    med_session = db.get(MeditationSession, session_id)
    if not med_session:
        raise ValueError("Session not found")
        
    records = db.exec(
        select(Attendance).where(Attendance.session_id == session_id)
    ).all()
    
    total_present = 0
    total_absent = 0
    read_records: List[AttendanceRead] = []
    
    for r in records:
        if r.attendance_status == "present":
            total_present += 1
        elif r.attendance_status == "absent":
            total_absent += 1
            
        student = db.get(Student, r.student_id)
        marker = db.get(User, r.marked_by) if r.marked_by else None
        
        read_records.append(
            AttendanceRead(
                id=r.id,
                student_id=r.student_id,
                session_id=r.session_id,
                attendance_status=r.attendance_status,
                marked_by=r.marked_by,
                marked_by_name=marker.full_name if marker else None,
                marked_at=r.marked_at,
                student_name=student.name if student else None,
                student_registration_number=student.registration_number if student else None,
                student_room_number=student.room_number if student else None,
                student_branch=student.branch if student else None,
                student_hostel_name=student.hostel_name if student else None,
            )
        )
        
    return SessionAttendanceResponse(
        session_id=med_session.id,
        session_name=med_session.session_name,
        session_date=med_session.session_date,
        total_present=total_present,
        total_absent=total_absent,
        total_marked=len(records),
        records=read_records
    )

def get_student_attendance(db: Session, student_id: int) -> StudentAttendanceStats:
    """Get full attendance history for a single student."""
    student = db.get(Student, student_id)
    if not student:
        raise ValueError("Student not found")
        
    total_sessions = db.exec(select(func.count(MeditationSession.id))).one()
    
    records = db.exec(
        select(Attendance)
        .where(Attendance.student_id == student_id)
        .order_by(col(Attendance.marked_at).desc())
    ).all()
    
    attended = sum(1 for r in records if r.attendance_status == "present")
    absent = sum(1 for r in records if r.attendance_status == "absent")
    rate = (attended / len(records) * 100) if records else 0.0
    
    read_records: List[AttendanceRead] = []
    for r in records:
        marker = db.get(User, r.marked_by) if r.marked_by else None
        read_records.append(
            AttendanceRead(
                id=r.id,
                student_id=r.student_id,
                session_id=r.session_id,
                attendance_status=r.attendance_status,
                marked_by=r.marked_by,
                marked_by_name=marker.full_name if marker else None,
                marked_at=r.marked_at,
                student_name=student.name,
                student_registration_number=student.registration_number,
                student_room_number=student.room_number,
                student_branch=student.branch,
                student_hostel_name=student.hostel_name
            )
        )
        
    return StudentAttendanceStats(
        student_id=student.id,
        student_name=student.name,
        registration_number=student.registration_number,
        total_sessions_held=total_sessions,
        sessions_attended=attended,
        sessions_absent=absent,
        attendance_rate=round(rate, 1),
        records=read_records
    )
