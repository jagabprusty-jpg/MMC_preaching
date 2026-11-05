from typing import List, Optional
from datetime import datetime, timezone
from sqlmodel import Session, select, col
from app.models.followup import Followup
from app.models.student import Student
from app.models.user import User
from app.schemas.followup import FollowupCreate, FollowupRead

def create_followup(
    db: Session,
    data: FollowupCreate,
    created_by_user_id: int
) -> FollowupRead:
    """Create a followup entry and optionally update student status."""
    student = db.get(Student, data.student_id)
    if not student:
        raise ValueError("Student not found")
        
    now_utc = datetime.now(timezone.utc)
    followup = Followup(
        student_id=data.student_id,
        contact_date=data.contact_date or now_utc,
        contact_status=data.contact_status,
        notes=data.notes,
        next_followup_date=data.next_followup_date,
        created_by=created_by_user_id,
        created_at=now_utc
    )
    db.add(followup)
    
    # If update_student_status is requested, update the student's status
    if data.update_student_status and data.update_student_status in ["new", "interested", "regular", "inactive"]:
        student.status = data.update_student_status
        student.updated_at = now_utc
        db.add(student)
        
    db.commit()
    db.refresh(followup)
    
    creator = db.get(User, created_by_user_id)
    return FollowupRead(
        id=followup.id,
        student_id=followup.student_id,
        contact_date=followup.contact_date,
        contact_status=followup.contact_status,
        notes=followup.notes,
        next_followup_date=followup.next_followup_date,
        created_by=followup.created_by,
        created_by_name=creator.full_name if creator else None,
        created_at=followup.created_at,
        student_name=student.name,
        student_registration_number=student.registration_number,
        student_phone_number=student.phone_number,
        student_room_number=student.room_number,
        student_hostel_name=student.hostel_name,
        student_status=student.status,
        consent_to_contact=student.consent_to_contact
    )

def list_followups(
    db: Session,
    student_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[FollowupRead]:
    """List followup logs with populated student and creator details."""
    query = select(Followup)
    if student_id:
        query = query.where(Followup.student_id == student_id)
    if status and status != "all":
        query = query.where(Followup.contact_status == status)
        
    records = db.exec(query.order_by(col(Followup.contact_date).desc())).all()
    
    results: List[FollowupRead] = []
    for f in records:
        student = db.get(Student, f.student_id)
        creator = db.get(User, f.created_by) if f.created_by else None
        
        results.append(
            FollowupRead(
                id=f.id,
                student_id=f.student_id,
                contact_date=f.contact_date,
                contact_status=f.contact_status,
                notes=f.notes,
                next_followup_date=f.next_followup_date,
                created_by=f.created_by,
                created_by_name=creator.full_name if creator else None,
                created_at=f.created_at,
                student_name=student.name if student else None,
                student_registration_number=student.registration_number if student else None,
                student_phone_number=student.phone_number if student else None,
                student_room_number=student.room_number if student else None,
                student_hostel_name=student.hostel_name if student else None,
                student_status=student.status if student else None,
                consent_to_contact=student.consent_to_contact if student else True
            )
        )
    return results
