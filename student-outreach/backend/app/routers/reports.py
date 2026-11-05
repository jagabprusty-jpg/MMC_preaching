import io
import csv
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Response
from sqlmodel import Session, select, func, col

from app.database import get_session
from app.models.student import Student
from app.models.session import Session as MeditationSession
from app.models.attendance import Attendance
from app.models.followup import Followup
from app.models.user import User
from app.dependencies import get_current_active_user
from app.services.student_service import get_student_stats

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("/attendance")
def get_attendance_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """
    Get detailed attendance analysis across sessions within an optional date range.
    """
    query = select(MeditationSession)
    if start_date:
        query = query.where(MeditationSession.session_date >= start_date)
    if end_date:
        query = query.where(MeditationSession.session_date <= end_date)
        
    sessions = db.exec(query.order_by(MeditationSession.session_date.asc())).all()
    
    session_reports = []
    total_present_all = 0
    total_absent_all = 0
    
    for s in sessions:
        present = db.exec(
            select(func.count(Attendance.id)).where(
                Attendance.session_id == s.id,
                Attendance.attendance_status == "present"
            )
        ).one()
        absent = db.exec(
            select(func.count(Attendance.id)).where(
                Attendance.session_id == s.id,
                Attendance.attendance_status == "absent"
            )
        ).one()
        total_marked = present + absent
        pct = (present / total_marked * 100) if total_marked > 0 else 0.0
        
        total_present_all += present
        total_absent_all += absent
        
        session_reports.append({
            "session_id": s.id,
            "session_name": s.session_name,
            "session_date": s.session_date,
            "location": s.location,
            "present_count": present,
            "absent_count": absent,
            "total_marked": total_marked,
            "attendance_rate": round(pct, 1)
        })
        
    overall_total = total_present_all + total_absent_all
    overall_rate = (total_present_all / overall_total * 100) if overall_total > 0 else 0.0
    
    return {
        "summary": {
            "total_sessions": len(sessions),
            "total_present": total_present_all,
            "total_absent": total_absent_all,
            "overall_attendance_rate": round(overall_rate, 1)
        },
        "sessions": session_reports
    }

@router.get("/branch-distribution")
def get_branch_and_hostel_distribution(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """
    Returns student distributions by branch, hostel, and status.
    """
    # 1. Branch distribution
    branch_counts = db.exec(
        select(Student.branch, func.count(Student.id))
        .group_by(Student.branch)
        .order_by(func.count(Student.id).desc())
    ).all()
    
    # 2. Hostel distribution
    hostel_counts = db.exec(
        select(Student.hostel_name, func.count(Student.id))
        .group_by(Student.hostel_name)
        .order_by(func.count(Student.id).desc())
    ).all()
    
    # 3. Status distribution
    status_counts = db.exec(
        select(Student.status, func.count(Student.id))
        .group_by(Student.status)
    ).all()
    
    return {
        "branches": [{"branch": b, "count": c} for b, c in branch_counts if b],
        "hostels": [{"hostel": h, "count": c} for h, c in hostel_counts if h],
        "statuses": [{"status": s, "count": c} for s, c in status_counts if s]
    }

@router.get("/students")
def get_students_report(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Summary of student demographics and participation metrics."""
    total = db.exec(select(func.count(Student.id))).one()
    regular = db.exec(select(func.count(Student.id)).where(Student.status == "regular")).one()
    inactive = db.exec(select(func.count(Student.id)).where(Student.status == "inactive")).one()
    interested = db.exec(select(func.count(Student.id)).where(Student.status == "interested")).one()
    new_status = db.exec(select(func.count(Student.id)).where(Student.status == "new")).one()
    consented = db.exec(select(func.count(Student.id)).where(Student.consent_to_contact == True)).one()
    
    return {
        "total_students": total,
        "regular_students": regular,
        "inactive_students": inactive,
        "interested_students": interested,
        "new_students": new_status,
        "consented_students": consented,
        "consent_rate": round((consented / total * 100), 1) if total > 0 else 0.0
    }

@router.get("/export/students")
def export_students_csv(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Download full student directory with attendance stats in CSV format."""
    students = db.exec(select(Student).order_by(Student.name.asc())).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Header
    writer.writerow([
        "ID",
        "Full Name",
        "Registration Number",
        "Room Number",
        "Hostel",
        "Branch",
        "Phone Number",
        "Status",
        "Interested",
        "Consent To Contact",
        "Total Attended",
        "Total Recorded",
        "Attendance Rate (%)",
        "Registered On",
        "Last Updated"
    ])
    
    for s in students:
        stats = get_student_stats(db, s.id)
        writer.writerow([
            s.id,
            s.name,
            s.registration_number,
            s.room_number,
            s.hostel_name,
            s.branch,
            s.phone_number if (current_user.role == "admin" or s.consent_to_contact) else "Masked",
            s.status,
            "Yes" if s.interested else "No",
            "Yes" if s.consent_to_contact else "No",
            stats["total_attended"],
            stats["total_sessions_recorded"],
            stats["attendance_rate"],
            s.created_at.strftime("%Y-%m-%d %H:%M"),
            s.updated_at.strftime("%Y-%m-%d %H:%M")
        ])
        
    output.seek(0)
    filename = f"student_outreach_directory_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/attendance")
def export_attendance_csv(
    session_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Download attendance records in CSV format."""
    query = select(Attendance)
    if session_id:
        query = query.where(Attendance.session_id == session_id)
        
    records = db.exec(query.order_by(col(Attendance.marked_at).desc())).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Attendance ID",
        "Session Name",
        "Session Date",
        "Location",
        "Student Name",
        "Registration Number",
        "Hostel",
        "Room",
        "Branch",
        "Attendance Status",
        "Marked By",
        "Marked At"
    ])
    
    for r in records:
        student = db.get(Student, r.student_id)
        sess = db.get(MeditationSession, r.session_id)
        marker = db.get(User, r.marked_by) if r.marked_by else None
        
        writer.writerow([
            r.id,
            sess.session_name if sess else "N/A",
            sess.session_date if sess else "N/A",
            sess.location if sess else "N/A",
            student.name if student else "Unknown",
            student.registration_number if student else "N/A",
            student.hostel_name if student else "N/A",
            student.room_number if student else "N/A",
            student.branch if student else "N/A",
            r.attendance_status.upper(),
            marker.full_name if marker else "System",
            r.marked_at.strftime("%Y-%m-%d %H:%M")
        ])
        
    output.seek(0)
    filename = f"attendance_records_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
