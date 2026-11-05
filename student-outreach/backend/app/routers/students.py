from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func

from app.database import get_session
from app.models.student import Student
from app.models.user import User
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentRead,
    StudentListResponse
)
from app.dependencies import get_current_active_user, require_admin
from app.services.student_service import get_students, get_student_stats
from app.services.followup_service import list_followups
from app.services.attendance_service import get_student_attendance

router = APIRouter(prefix="/api/students", tags=["Students"])

@router.get("", response_model=StudentListResponse)
def list_students(
    search: Optional[str] = Query(None, description="Search by name, reg number, room or phone"),
    branch: Optional[str] = Query(None, description="Filter by branch"),
    hostel: Optional[str] = Query(None, description="Filter by hostel name"),
    status: Optional[str] = Query(None, description="Filter by status (new, interested, regular, inactive)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Retrieve filtered and paginated list of students."""
    items, total = get_students(
        db=db,
        search=search,
        branch=branch,
        hostel=hostel,
        status=status,
        page=page,
        limit=limit
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return StudentListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.get("/meta/filters")
def get_filter_options(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Get distinct branches and hostels for filter dropdowns."""
    branches = db.exec(
        select(Student.branch).distinct().where(Student.branch != None)
    ).all()
    hostels = db.exec(
        select(Student.hostel_name).distinct().where(Student.hostel_name != None)
    ).all()
    
    return {
        "branches": sorted([b for b in branches if b]),
        "hostels": sorted([h for h in hostels if h]),
        "statuses": ["new", "interested", "regular", "inactive"]
    }

@router.post("", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Register a new student with duplicate registration number prevention."""
    reg_no = payload.registration_number.strip().upper()
    existing = db.exec(
        select(Student).where(Student.registration_number == reg_no)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A student with registration number '{reg_no}' already exists (Name: {existing.name}, Room: {existing.room_number})"
        )
        
    now_utc = datetime.now(timezone.utc)
    new_student = Student(
        name=payload.name.strip(),
        registration_number=reg_no,
        room_number=payload.room_number.strip(),
        branch=payload.branch.strip(),
        phone_number=payload.phone_number.strip(),
        hostel_name=payload.hostel_name.strip(),
        interested=payload.interested,
        status=payload.status if payload.status in ["new", "interested", "regular", "inactive"] else "new",
        consent_to_contact=payload.consent_to_contact,
        registered_by=current_user.id,
        created_at=now_utc,
        updated_at=now_utc
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    stats = get_student_stats(db, new_student.id)
    return StudentRead(
        id=new_student.id,
        name=new_student.name,
        registration_number=new_student.registration_number,
        room_number=new_student.room_number,
        branch=new_student.branch,
        phone_number=new_student.phone_number,
        hostel_name=new_student.hostel_name,
        interested=new_student.interested,
        status=new_student.status,
        consent_to_contact=new_student.consent_to_contact,
        registered_by=new_student.registered_by,
        registered_by_name=current_user.full_name,
        created_at=new_student.created_at,
        updated_at=new_student.updated_at,
        total_attended=stats["total_attended"],
        total_sessions_recorded=stats["total_sessions_recorded"],
        attendance_rate=stats["attendance_rate"],
        last_followup_status=stats["last_followup_status"],
        last_followup_date=stats["last_followup_date"]
    )

@router.get("/{student_id}")
def get_student_detail(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Get complete student profile including attendance stats and followup history."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
        
    stats = get_student_stats(db, student.id)
    attendance_stats = get_student_attendance(db, student.id)
    followups = list_followups(db, student_id=student.id)
    reg_user = db.get(User, student.registered_by) if student.registered_by else None
    
    return {
        "student": StudentRead(
            id=student.id,
            name=student.name,
            registration_number=student.registration_number,
            room_number=student.room_number,
            branch=student.branch,
            phone_number=student.phone_number,
            hostel_name=student.hostel_name,
            interested=student.interested,
            status=student.status,
            consent_to_contact=student.consent_to_contact,
            registered_by=student.registered_by,
            registered_by_name=reg_user.full_name if reg_user else None,
            created_at=student.created_at,
            updated_at=student.updated_at,
            total_attended=stats["total_attended"],
            total_sessions_recorded=stats["total_sessions_recorded"],
            attendance_rate=stats["attendance_rate"],
            last_followup_status=stats["last_followup_status"],
            last_followup_date=stats["last_followup_date"]
        ),
        "attendance_stats": attendance_stats,
        "followups": followups
    }

@router.put("/{student_id}", response_model=StudentRead)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Update student profile details."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
        
    if payload.registration_number is not None:
        new_reg = payload.registration_number.strip().upper()
        if new_reg != student.registration_number:
            existing = db.exec(
                select(Student).where(Student.registration_number == new_reg)
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Registration number '{new_reg}' is already in use by another student"
                )
            student.registration_number = new_reg

    if payload.name is not None:
        student.name = payload.name.strip()
    if payload.room_number is not None:
        student.room_number = payload.room_number.strip()
    if payload.branch is not None:
        student.branch = payload.branch.strip()
    if payload.phone_number is not None:
        student.phone_number = payload.phone_number.strip()
    if payload.hostel_name is not None:
        student.hostel_name = payload.hostel_name.strip()
    if payload.interested is not None:
        student.interested = payload.interested
    if payload.status is not None and payload.status in ["new", "interested", "regular", "inactive"]:
        student.status = payload.status
    if payload.consent_to_contact is not None:
        student.consent_to_contact = payload.consent_to_contact
        
    student.updated_at = datetime.now(timezone.utc)
    db.add(student)
    db.commit()
    db.refresh(student)
    
    stats = get_student_stats(db, student.id)
    reg_user = db.get(User, student.registered_by) if student.registered_by else None
    
    return StudentRead(
        id=student.id,
        name=student.name,
        registration_number=student.registration_number,
        room_number=student.room_number,
        branch=student.branch,
        phone_number=student.phone_number,
        hostel_name=student.hostel_name,
        interested=student.interested,
        status=student.status,
        consent_to_contact=student.consent_to_contact,
        registered_by=student.registered_by,
        registered_by_name=reg_user.full_name if reg_user else None,
        created_at=student.created_at,
        updated_at=student.updated_at,
        total_attended=stats["total_attended"],
        total_sessions_recorded=stats["total_sessions_recorded"],
        attendance_rate=stats["attendance_rate"],
        last_followup_status=stats["last_followup_status"],
        last_followup_date=stats["last_followup_date"]
    )

@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Delete a student and their corresponding attendance & followup records."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
        
    name = student.name
    reg_no = student.registration_number
    db.delete(student)
    db.commit()
    return {"message": f"Student '{name}' ({reg_no}) deleted successfully"}
