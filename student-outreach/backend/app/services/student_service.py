from typing import Optional, List, Dict, Any, Tuple
from sqlmodel import Session, select, func, or_, col
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.session import Session as MeditationSession
from app.models.followup import Followup
from app.models.user import User
from app.schemas.student import StudentCreate, StudentUpdate, StudentRead

def get_student_stats(db: Session, student_id: int) -> Dict[str, Any]:
    """Calculate attendance and followup statistics for a student."""
    total_marked = db.exec(
        select(func.count(Attendance.id)).where(Attendance.student_id == student_id)
    ).one()
    
    total_attended = db.exec(
        select(func.count(Attendance.id)).where(
            Attendance.student_id == student_id,
            Attendance.attendance_status == "present"
        )
    ).one()
    
    attendance_rate = (total_attended / total_marked * 100) if total_marked > 0 else 0.0
    
    # Get last followup
    last_followup = db.exec(
        select(Followup)
        .where(Followup.student_id == student_id)
        .order_by(col(Followup.contact_date).desc())
    ).first()
    
    return {
        "total_sessions_recorded": total_marked,
        "total_attended": total_attended,
        "attendance_rate": round(attendance_rate, 1),
        "last_followup_status": last_followup.contact_status if last_followup else None,
        "last_followup_date": (
            last_followup.contact_date.strftime("%Y-%m-%d") if last_followup else None
        )
    }

def get_students(
    db: Session,
    search: Optional[str] = None,
    branch: Optional[str] = None,
    hostel: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
) -> Tuple[List[StudentRead], int]:
    """Get paginated and filtered list of students with calculated stats."""
    query = select(Student)
    
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.name.ilike(search_term),
                Student.registration_number.ilike(search_term),
                Student.room_number.ilike(search_term),
                Student.phone_number.ilike(search_term)
            )
        )
        
    if branch and branch != "all":
        query = query.where(Student.branch == branch)
        
    if hostel and hostel != "all":
        query = query.where(Student.hostel_name == hostel)
        
    if status and status != "all":
        query = query.where(Student.status == status)
        
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.exec(count_query).one()
    
    # Paginate and order by newest first
    offset = (page - 1) * limit
    results = db.exec(
        query.order_by(col(Student.created_at).desc()).offset(offset).limit(limit)
    ).all()
    
    students_read: List[StudentRead] = []
    for s in results:
        stats = get_student_stats(db, s.id)
        reg_user = db.get(User, s.registered_by) if s.registered_by else None
        
        students_read.append(
            StudentRead(
                id=s.id,
                name=s.name,
                registration_number=s.registration_number,
                room_number=s.room_number,
                branch=s.branch,
                phone_number=s.phone_number,
                hostel_name=s.hostel_name,
                interested=s.interested,
                status=s.status,
                consent_to_contact=s.consent_to_contact,
                registered_by=s.registered_by,
                registered_by_name=reg_user.full_name if reg_user else None,
                created_at=s.created_at,
                updated_at=s.updated_at,
                total_attended=stats["total_attended"],
                total_sessions_recorded=stats["total_sessions_recorded"],
                attendance_rate=stats["attendance_rate"],
                last_followup_status=stats["last_followup_status"],
                last_followup_date=stats["last_followup_date"]
            )
        )
        
    return students_read, total

def get_students_needing_followup(db: Session) -> List[Dict[str, Any]]:
    """
    Find students who:
    1. Never attended after registration (have attendance record marked as absent or no attendance while sessions exist)
    2. Missed several recent sessions
    3. Have a scheduled next_followup_date
    """
    students = db.exec(select(Student)).all()
    results = []
    
    # Get total sessions count
    total_sessions = db.exec(select(func.count(MeditationSession.id))).one()
    
    for student in students:
        stats = get_student_stats(db, student.id)
        
        # Check last followup
        last_followup = db.exec(
            select(Followup)
            .where(Followup.student_id == student.id)
            .order_by(col(Followup.contact_date).desc())
        ).first()
        
        reasons = []
        
        # Reason 1: Scheduled follow-up exists
        if last_followup and last_followup.next_followup_date:
            reasons.append(f"Follow-up scheduled: {last_followup.next_followup_date}")
            
        # Reason 2: Never attended
        if total_sessions > 0 and stats["total_attended"] == 0:
            reasons.append("Never attended any session")
            
        # Reason 3: Inactive status
        elif student.status == "inactive":
            reasons.append("Status is marked Inactive")
            
        # Reason 4: Low attendance rate with at least 3 sessions
        elif stats["total_sessions_recorded"] >= 2 and stats["attendance_rate"] < 50.0:
            reasons.append(f"Low attendance rate ({stats['attendance_rate']}%)")
            
        # If student is interested or new and has reasons, include
        if reasons:
            results.append({
                "student_id": student.id,
                "name": student.name,
                "registration_number": student.registration_number,
                "phone_number": student.phone_number,
                "room_number": student.room_number,
                "hostel_name": student.hostel_name,
                "branch": student.branch,
                "status": student.status,
                "consent_to_contact": student.consent_to_contact,
                "attendance_rate": stats["attendance_rate"],
                "total_attended": stats["total_attended"],
                "last_followup_date": stats["last_followup_date"],
                "last_followup_status": stats["last_followup_status"],
                "reasons": reasons,
                "primary_reason": reasons[0]
            })
            
    return results
