from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, col

from app.database import get_session
from app.models.session import Session as MeditationSession
from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.session import (
    SessionCreate,
    SessionUpdate,
    SessionRead,
    SessionListResponse
)
from app.dependencies import get_current_active_user, require_admin

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

@router.get("", response_model=SessionListResponse)
def list_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """List all meditation sessions with total attendance counts."""
    sessions = db.exec(
        select(MeditationSession).order_by(
            col(MeditationSession.session_date).desc(),
            col(MeditationSession.start_time).desc()
        )
    ).all()
    
    results: List[SessionRead] = []
    for s in sessions:
        attendances = db.exec(
            select(Attendance).where(Attendance.session_id == s.id)
        ).all()
        present = sum(1 for a in attendances if a.attendance_status == "present")
        absent = sum(1 for a in attendances if a.attendance_status == "absent")
        creator = db.get(User, s.created_by) if s.created_by else None
        
        results.append(
            SessionRead(
                id=s.id,
                session_name=s.session_name,
                session_date=s.session_date,
                start_time=s.start_time,
                location=s.location,
                description=s.description,
                created_by=s.created_by,
                creator_name=creator.full_name if creator else None,
                created_at=s.created_at,
                total_present=present,
                total_absent=absent,
                total_marked=len(attendances)
            )
        )
        
    return SessionListResponse(items=results, total=len(results))

@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Create a new meditation outreach session."""
    now_utc = datetime.now(timezone.utc)
    new_session = MeditationSession(
        session_name=payload.session_name.strip(),
        session_date=payload.session_date.strip(),
        start_time=payload.start_time.strip(),
        location=payload.location.strip(),
        description=payload.description.strip() if payload.description else None,
        created_by=current_user.id,
        created_at=now_utc
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return SessionRead(
        id=new_session.id,
        session_name=new_session.session_name,
        session_date=new_session.session_date,
        start_time=new_session.start_time,
        location=new_session.location,
        description=new_session.description,
        created_by=new_session.created_by,
        creator_name=current_user.full_name,
        created_at=new_session.created_at,
        total_present=0,
        total_absent=0,
        total_marked=0
    )

@router.get("/{session_id}", response_model=SessionRead)
def get_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Get single session details."""
    s = db.get(MeditationSession, session_id)
    if not s:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
        
    attendances = db.exec(
        select(Attendance).where(Attendance.session_id == s.id)
    ).all()
    present = sum(1 for a in attendances if a.attendance_status == "present")
    absent = sum(1 for a in attendances if a.attendance_status == "absent")
    creator = db.get(User, s.created_by) if s.created_by else None
    
    return SessionRead(
        id=s.id,
        session_name=s.session_name,
        session_date=s.session_date,
        start_time=s.start_time,
        location=s.location,
        description=s.description,
        created_by=s.created_by,
        creator_name=creator.full_name if creator else None,
        created_at=s.created_at,
        total_present=present,
        total_absent=absent,
        total_marked=len(attendances)
    )

@router.put("/{session_id}", response_model=SessionRead)
def update_session(
    session_id: int,
    payload: SessionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Update session details."""
    s = db.get(MeditationSession, session_id)
    if not s:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
        
    if payload.session_name is not None:
        s.session_name = payload.session_name.strip()
    if payload.session_date is not None:
        s.session_date = payload.session_date.strip()
    if payload.start_time is not None:
        s.start_time = payload.start_time.strip()
    if payload.location is not None:
        s.location = payload.location.strip()
    if payload.description is not None:
        s.description = payload.description.strip()
        
    db.add(s)
    db.commit()
    db.refresh(s)
    
    attendances = db.exec(
        select(Attendance).where(Attendance.session_id == s.id)
    ).all()
    present = sum(1 for a in attendances if a.attendance_status == "present")
    absent = sum(1 for a in attendances if a.attendance_status == "absent")
    creator = db.get(User, s.created_by) if s.created_by else None
    
    return SessionRead(
        id=s.id,
        session_name=s.session_name,
        session_date=s.session_date,
        start_time=s.start_time,
        location=s.location,
        description=s.description,
        created_by=s.created_by,
        creator_name=creator.full_name if creator else None,
        created_at=s.created_at,
        total_present=present,
        total_absent=absent,
        total_marked=len(attendances)
    )

@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Delete a session and all its marked attendance records."""
    s = db.get(MeditationSession, session_id)
    if not s:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    name = s.session_name
    db.delete(s)
    db.commit()
    return {"message": f"Session '{name}' deleted successfully"}
