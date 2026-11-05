from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserRead,
    ChangePasswordRequest,
    UserCreate,
    UserUpdate
)
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentRead,
    StudentListResponse
)
from app.schemas.session import (
    SessionCreate,
    SessionUpdate,
    SessionRead,
    SessionListResponse
)
from app.schemas.attendance import (
    AttendanceRecordItem,
    AttendanceBulkCreate,
    AttendanceSingleCreate,
    AttendanceUpdate,
    AttendanceRead,
    SessionAttendanceResponse,
    StudentAttendanceStats
)
from app.schemas.followup import (
    FollowupCreate,
    FollowupUpdate,
    FollowupRead,
    FollowupListResponse
)
from app.schemas.photo_student import (
    PhotoStudentRead,
    PhotoStudentListResponse,
    PhotoStudentUpdate
)

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UserRead",
    "ChangePasswordRequest",
    "UserCreate",
    "UserUpdate",
    "StudentCreate",
    "StudentUpdate",
    "StudentRead",
    "StudentListResponse",
    "SessionCreate",
    "SessionUpdate",
    "SessionRead",
    "SessionListResponse",
    "AttendanceRecordItem",
    "AttendanceBulkCreate",
    "AttendanceSingleCreate",
    "AttendanceUpdate",
    "AttendanceRead",
    "SessionAttendanceResponse",
    "StudentAttendanceStats",
    "FollowupCreate",
    "FollowupUpdate",
    "FollowupRead",
    "FollowupListResponse",
    "PhotoStudentRead",
    "PhotoStudentListResponse",
    "PhotoStudentUpdate",
]
