from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, col

from app.database import get_session
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.session import Session as MeditationSession
from app.models.user import User
from app.schemas.attendance import (
    AttendanceBulkCreate,
    AttendanceSingleCreate,
    AttendanceUpdate,
    AttendanceRead,
    SessionAttendanceResponse,
    StudentAttendanceStats
)
from app.dependencies import get_current_active_user
from app.services.attendance_service import (
    mark_bulk_attendance,
    get_session_attendance,
    get_student_attendance
)

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

@router.get("", response_model=List[AttendanceRead])
def list_attendance(
    session_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Query attendance records with optional filters."""
    query = select(Attendance)
    if session_id:
        query = query.where(Attendance.session_id == session_id)
    if student_id:
        query = query.where(Attendance.student_id == student_id)
    if status_filter and status_filter in ["present", "absent"]:
        query = query.where(Attendance.attendance_status == status_filter)
        
    records = db.exec(query.order_by(col(Attendance.marked_at).desc())).all()
    results: List[AttendanceRead] = []
    
    for r in records:
        student = db.get(Student, r.student_id)
        marker = db.get(User, r.marked_by) if r.marked_by else None
        results.append(
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
                student_hostel_name=student.hostel_name if student else None
            )
        )
    return results

@router.post("", response_model=SessionAttendanceResponse)
def record_attendance(
    payload: AttendanceBulkCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Mark attendance in bulk for a session (insert or update)."""
    try:
        response = mark_bulk_attendance(
            db=db,
            session_id=payload.session_id,
            records=payload.records,
            marked_by_user_id=current_user.id
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/single", response_model=AttendanceRead)
def mark_single_attendance(
    payload: AttendanceSingleCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Mark or toggle individual student attendance for a session."""
    student = db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    med_session = db.get(MeditationSession, payload.session_id)
    if not med_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        
    now_utc = datetime.now(timezone.utc)
    existing = db.exec(
        select(Attendance).where(
            Attendance.student_id == payload.student_id,
            Attendance.session_id == payload.session_id
        )
    ).first()
    
    if existing:
        existing.attendance_status = payload.attendance_status
        existing.marked_by = current_user.id
        existing.marked_at = now_utc
        db.add(existing)
        target = existing
    else:
        new_att = Attendance(
            student_id=payload.student_id,
            session_id=payload.session_id,
            attendance_status=payload.attendance_status,
            marked_by=current_user.id,
            marked_at=now_utc
        )
        db.add(new_att)
        target = new_att
        
    db.commit()
    db.refresh(target)
    
    return AttendanceRead(
        id=target.id,
        student_id=target.student_id,
        session_id=target.session_id,
        attendance_status=target.attendance_status,
        marked_by=target.marked_by,
        marked_by_name=current_user.full_name,
        marked_at=target.marked_at,
        student_name=student.name,
        student_registration_number=student.registration_number,
        student_room_number=student.room_number,
        student_branch=student.branch,
        student_hostel_name=student.hostel_name
    )

@router.put("/{attendance_id}", response_model=AttendanceRead)
def update_attendance_status(
    attendance_id: int,
    payload: AttendanceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Update single attendance record status."""
    rec = db.get(Attendance, attendance_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
        
    rec.attendance_status = payload.attendance_status
    rec.marked_by = current_user.id
    rec.marked_at = datetime.now(timezone.utc)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    
    student = db.get(Student, rec.student_id)
    return AttendanceRead(
        id=rec.id,
        student_id=rec.student_id,
        session_id=rec.session_id,
        attendance_status=rec.attendance_status,
        marked_by=rec.marked_by,
        marked_by_name=current_user.full_name,
        marked_at=rec.marked_at,
        student_name=student.name if student else None,
        student_registration_number=student.registration_number if student else None,
        student_room_number=student.room_number if student else None,
        student_branch=student.branch if student else None,
        student_hostel_name=student.hostel_name if student else None
    )

@router.get("/session/{session_id}", response_model=SessionAttendanceResponse)
def get_attendance_for_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Retrieve full attendance list for a session with counts."""
    try:
        return get_session_attendance(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/student/{student_id}", response_model=StudentAttendanceStats)
def get_attendance_for_student(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Retrieve full attendance history and percentage for a student."""
    try:
        return get_student_attendance(db, student_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
