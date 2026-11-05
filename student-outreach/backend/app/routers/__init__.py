from app.routers.auth import router as auth_router
from app.routers.students import router as students_router
from app.routers.sessions import router as sessions_router
from app.routers.attendance import router as attendance_router
from app.routers.followups import router as followups_router
from app.routers.dashboard import router as dashboard_router
from app.routers.reports import router as reports_router
from app.routers.photo_students import router as photo_students_router

__all__ = [
    "auth_router",
    "students_router",
    "sessions_router",
    "attendance_router",
    "followups_router",
    "dashboard_router",
    "reports_router",
    "photo_students_router",
]
