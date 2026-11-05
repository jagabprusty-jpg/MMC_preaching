from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from app.database import get_session
from app.models.followup import Followup
from app.models.user import User
from app.schemas.followup import (
    FollowupCreate,
    FollowupUpdate,
    FollowupRead,
    FollowupListResponse
)
from app.dependencies import get_current_active_user
from app.services.followup_service import create_followup, list_followups
from app.services.student_service import get_students_needing_followup

router = APIRouter(prefix="/api/followups", tags=["Follow-ups"])

@router.get("", response_model=FollowupListResponse)
def get_all_followups(
    student_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Retrieve history of all logged followups with filters."""
    items = list_followups(db=db, student_id=student_id, status=status)
    return FollowupListResponse(items=items, total=len(items))

@router.get("/pending")
def get_pending_followup_students(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Get smart list of students needing follow-up (never attended, missed sessions, scheduled date)."""
    students = get_students_needing_followup(db)
    return {"items": students, "total": len(students)}

@router.post("", response_model=FollowupRead, status_code=status.HTTP_201_CREATED)
def add_followup(
    payload: FollowupCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Log a contact interaction with a student."""
    try:
        record = create_followup(
            db=db,
            data=payload,
            created_by_user_id=current_user.id
        )
        return record
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.put("/{followup_id}", response_model=FollowupRead)
def update_followup(
    followup_id: int,
    payload: FollowupUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Edit existing follow-up notes or next scheduled date."""
    f = db.get(Followup, followup_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Followup record not found")
        
    if payload.contact_status is not None:
        f.contact_status = payload.contact_status
    if payload.notes is not None:
        f.notes = payload.notes.strip()
    if payload.next_followup_date is not None:
        f.next_followup_date = payload.next_followup_date
        
    db.add(f)
    db.commit()
    db.refresh(f)
    
    # Return formatted read object
    items = list_followups(db=db, student_id=f.student_id)
    target = next((i for i in items if i.id == f.id), None)
    return target

@router.delete("/{followup_id}")
def delete_followup(
    followup_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Delete a follow-up log entry."""
    f = db.get(Followup, followup_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Followup not found")
    db.delete(f)
    db.commit()
    return {"message": "Followup record deleted successfully"}
