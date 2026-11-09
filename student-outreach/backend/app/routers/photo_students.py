import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlmodel import Session, select, func, or_, col

from app.database import get_session
from app.config import settings
from app.models.photo_student import PhotoStudent
from app.models.user import User
from app.schemas.photo_student import (
    PhotoStudentRead,
    PhotoStudentListResponse,
    PhotoStudentUpdate
)
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/api/photo-students", tags=["Photo Students Directory"])

# Directory where uploaded student photos will be saved
UPLOAD_DIR = settings.UPLOADS_DIR / "students"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def resolve_image_extension(filename: Optional[str], content_type: Optional[str]) -> str:
    """Safely determine image extension from filename or MIME type (essential for mobile uploads)."""
    ext = Path(filename or "").suffix.lower()
    if ext in ALLOWED_EXTENSIONS:
        return ext

    ct = (content_type or "").lower()
    if "jpeg" in ct or "jpg" in ct:
        return ".jpg"
    elif "png" in ct:
        return ".png"
    elif "webp" in ct:
        return ".webp"
    elif "gif" in ct:
        return ".gif"
    elif "heic" in ct:
        return ".heic"
    elif "heif" in ct:
        return ".heif"
    elif "bmp" in ct:
        return ".bmp"

    # Default fallback for camera snapshots
    return ".jpg"

@router.get("", response_model=PhotoStudentListResponse)
def list_photo_students(
    search: Optional[str] = Query(None, description="Search by student name, phone or notes"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Retrieve filtered and paginated list of students with photos."""
    query = select(PhotoStudent)

    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                PhotoStudent.name.ilike(term),
                PhotoStudent.phone_number.ilike(term),
                PhotoStudent.notes.ilike(term)
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.exec(count_query).one()

    # Paginate, newest first
    offset = (page - 1) * limit
    results = db.exec(
        query.order_by(col(PhotoStudent.created_at).desc()).offset(offset).limit(limit)
    ).all()

    items: List[PhotoStudentRead] = []
    for s in results:
        creator = db.get(User, s.created_by) if s.created_by else None
        items.append(
            PhotoStudentRead(
                id=s.id,
                name=s.name,
                phone_number=s.phone_number,
                photo_url=s.photo_url,
                notes=s.notes,
                created_by=s.created_by,
                created_by_name=creator.full_name if creator else None,
                created_at=s.created_at,
                updated_at=s.updated_at
            )
        )

    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PhotoStudentListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.post("", response_model=PhotoStudentRead, status_code=status.HTTP_201_CREATED)
async def create_photo_student(
    name: str = Form(..., description="Student full name"),
    phone_number: str = Form(..., description="Contact phone number"),
    notes: Optional[str] = Form(None, description="Optional hostel, room, or additional details"),
    photo: UploadFile = File(..., description="High-resolution student photo file"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Upload a new student entry with photo, name, and phone number."""
    if not name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student name is required")
    if not phone_number.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required")

    # Validate image extension and format (handles mobile blobs and extensionless uploads)
    ext = resolve_image_extension(photo.filename, photo.content_type)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read content to check size
    contents = await photo.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image exceeds maximum limit of 10MB ({len(contents) // (1024*1024)}MB provided)"
        )

    # Save to disk with unique filename
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = UPLOAD_DIR / unique_filename

    with open(target_path, "wb") as f:
        f.write(contents)

    photo_url = f"/uploads/students/{unique_filename}"
    now_utc = datetime.now(timezone.utc)

    new_record = PhotoStudent(
        name=name.strip(),
        phone_number=phone_number.strip(),
        photo_url=photo_url,
        notes=notes.strip() if notes else None,
        created_by=current_user.id,
        created_at=now_utc,
        updated_at=now_utc
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return PhotoStudentRead(
        id=new_record.id,
        name=new_record.name,
        phone_number=new_record.phone_number,
        photo_url=new_record.photo_url,
        notes=new_record.notes,
        created_by=new_record.created_by,
        created_by_name=current_user.full_name,
        created_at=new_record.created_at,
        updated_at=new_record.updated_at
    )

@router.get("/{id}", response_model=PhotoStudentRead)
def get_photo_student(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Retrieve details of a single photo student."""
    record = db.get(PhotoStudent, id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")

    creator = db.get(User, record.created_by) if record.created_by else None
    return PhotoStudentRead(
        id=record.id,
        name=record.name,
        phone_number=record.phone_number,
        photo_url=record.photo_url,
        notes=record.notes,
        created_by=record.created_by,
        created_by_name=creator.full_name if creator else None,
        created_at=record.created_at,
        updated_at=record.updated_at
    )

@router.put("/{id}", response_model=PhotoStudentRead)
async def update_photo_student(
    id: int,
    name: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Update student info or upload a new photo replacement."""
    record = db.get(PhotoStudent, id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")

    if name is not None and name.strip():
        record.name = name.strip()
    if phone_number is not None and phone_number.strip():
        record.phone_number = phone_number.strip()
    if notes is not None:
        record.notes = notes.strip() if notes.strip() else None

    # If new photo uploaded, replace old one
    if photo and (photo.filename or photo.size):
        ext = resolve_image_extension(photo.filename, photo.content_type)
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'"
            )

        contents = await photo.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image exceeds 10MB limit")

        # Try to delete old photo file
        if record.photo_url and record.photo_url.startswith("/uploads/students/"):
            old_filename = Path(record.photo_url).name
            old_file = UPLOAD_DIR / old_filename
            if old_file.exists():
                try:
                    old_file.unlink()
                except Exception:
                    pass

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = UPLOAD_DIR / unique_filename
        with open(target_path, "wb") as f:
            f.write(contents)

        record.photo_url = f"/uploads/students/{unique_filename}"

    record.updated_at = datetime.now(timezone.utc)
    db.add(record)
    db.commit()
    db.refresh(record)

    creator = db.get(User, record.created_by) if record.created_by else None
    return PhotoStudentRead(
        id=record.id,
        name=record.name,
        phone_number=record.phone_number,
        photo_url=record.photo_url,
        notes=record.notes,
        created_by=record.created_by,
        created_by_name=creator.full_name if creator else None,
        created_at=record.created_at,
        updated_at=record.updated_at
    )

@router.delete("/{id}")
def delete_photo_student(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """Delete student record and remove image from disk."""
    record = db.get(PhotoStudent, id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")

    # Remove file from disk
    if record.photo_url and record.photo_url.startswith("/uploads/students/"):
        old_filename = Path(record.photo_url).name
        photo_path = UPLOAD_DIR / old_filename
        if photo_path.exists():
            try:
                photo_path.unlink()
            except Exception:
                pass

    name = record.name
    db.delete(record)
    db.commit()
    return {"message": f"Student '{name}' and photo deleted successfully"}
