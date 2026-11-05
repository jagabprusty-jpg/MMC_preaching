from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func, col

from app.database import get_session
from app.models.student import Student
from app.models.session import Session as MeditationSession
from app.models.attendance import Attendance
from app.models.followup import Followup
from app.models.user import User
from app.dependencies import get_current_active_user
from app.services.student_service import get_student_stats, get_students_needing_followup

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """
    Returns the 6 primary dashboard metric cards:
    1. Total Students
    2. Today's Attendance (present count in today's sessions)
    3. Regular Students
    4. Inactive Students
    5. Pending Follow-ups
    6. Total Sessions
    """
    total_students = db.exec(select(func.count(Student.id))).one()
    regular_students = db.exec(
        select(func.count(Student.id)).where(Student.status == "regular")
    ).one()
    inactive_students = db.exec(
        select(func.count(Student.id)).where(Student.status == "inactive")
    ).one()
    total_sessions = db.exec(select(func.count(MeditationSession.id))).one()
    
    # Today's attendance
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_sessions = db.exec(
        select(MeditationSession).where(MeditationSession.session_date == today_str)
    ).all()
    today_session_ids = [s.id for s in today_sessions]
    
    today_present = 0
    today_absent = 0
    if today_session_ids:
        today_present = db.exec(
            select(func.count(Attendance.id)).where(
                col(Attendance.session_id).in_(today_session_ids),
                Attendance.attendance_status == "present"
            )
        ).one()
        today_absent = db.exec(
            select(func.count(Attendance.id)).where(
                col(Attendance.session_id).in_(today_session_ids),
                Attendance.attendance_status == "absent"
            )
        ).one()

    # Pending follow-ups
    pending_followups_list = get_students_needing_followup(db)
    pending_followups_count = len(pending_followups_list)
    
    return {
        "total_students": total_students,
        "todays_attendance": {
            "present": today_present,
            "absent": today_absent,
            "sessions_count": len(today_sessions),
            "date": today_str
        },
        "regular_students": regular_students,
        "inactive_students": inactive_students,
        "pending_followups": pending_followups_count,
        "total_sessions": total_sessions
    }

@router.get("/recent-students")
def get_recent_students(
    limit: int = 5,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Fetch the latest registered students."""
    students = db.exec(
        select(Student).order_by(col(Student.created_at).desc()).limit(limit)
    ).all()
    
    results = []
    for s in students:
        reg_user = db.get(User, s.registered_by) if s.registered_by else None
        results.append({
            "id": s.id,
            "name": s.name,
            "registration_number": s.registration_number,
            "room_number": s.room_number,
            "branch": s.branch,
            "hostel_name": s.hostel_name,
            "phone_number": s.phone_number,
            "status": s.status,
            "consent_to_contact": s.consent_to_contact,
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M"),
            "registered_by_name": reg_user.full_name if reg_user else "Volunteer"
        })
    return results

@router.get("/attendance-trends")
def get_attendance_trends(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """
    Returns weekly attendance chart data and monthly registration trend data.
    """
    # 1. Last 7 sessions attendance trend
    recent_sessions = db.exec(
        select(MeditationSession)
        .order_by(col(MeditationSession.session_date).desc())
        .limit(7)
    ).all()
    # Reverse to chronological order
    recent_sessions.reverse()
    
    session_labels = []
    present_data = []
    absent_data = []
    
    for s in recent_sessions:
        session_labels.append(f"{s.session_name} ({s.session_date[-5:]})")
        p_count = db.exec(
            select(func.count(Attendance.id)).where(
                Attendance.session_id == s.id,
                Attendance.attendance_status == "present"
            )
        ).one()
        a_count = db.exec(
            select(func.count(Attendance.id)).where(
                Attendance.session_id == s.id,
                Attendance.attendance_status == "absent"
            )
        ).one()
        present_data.append(p_count)
        absent_data.append(a_count)
        
    # 2. Monthly registration trend (last 6 months)
    students = db.exec(select(Student.created_at)).all()
    month_counts: Dict[str, int] = {}
    
    # Generate keys for last 6 months
    today = date.today()
    for i in range(5, -1, -1):
        # Approximate month subtraction
        target_month_date = today.replace(day=1) - timedelta(days=i * 28)
        month_key = target_month_date.strftime("%b %Y")
        month_counts[month_key] = 0
        
    for created in students:
        if created:
            key = created.strftime("%b %Y")
            if key in month_counts:
                month_counts[key] += 1
            else:
                month_counts[key] = 1

    return {
        "weekly_attendance": {
            "labels": session_labels,
            "present": present_data,
            "absent": absent_data
        },
        "monthly_registrations": {
            "labels": list(month_counts.keys()),
            "data": list(month_counts.values())
        }
    }

@router.get("/upcoming-sessions")
def get_upcoming_sessions(
    limit: int = 4,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Retrieve upcoming or most recent sessions."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sessions = db.exec(
        select(MeditationSession)
        .where(MeditationSession.session_date >= today_str)
        .order_by(MeditationSession.session_date.asc(), MeditationSession.start_time.asc())
        .limit(limit)
    ).all()
    
    if len(sessions) < limit:
        # Also include recent past sessions if few upcoming
        additional = db.exec(
            select(MeditationSession)
            .where(MeditationSession.session_date < today_str)
            .order_by(MeditationSession.session_date.desc())
            .limit(limit - len(sessions))
        ).all()
        sessions = list(sessions) + list(additional)
        
    results = []
    for s in sessions:
        present = db.exec(
            select(func.count(Attendance.id)).where(
                Attendance.session_id == s.id,
                Attendance.attendance_status == "present"
            )
        ).one()
        results.append({
            "id": s.id,
            "session_name": s.session_name,
            "session_date": s.session_date,
            "start_time": s.start_time,
            "location": s.location,
            "description": s.description,
            "total_present": present,
            "is_upcoming": s.session_date >= today_str
        })
    return results
