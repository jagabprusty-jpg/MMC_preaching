import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import (
    auth_router,
    dashboard_router,
    students_router,
    attendance_router,
    sessions_router,
    followups_router,
    reports_router,
    photo_students_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and default accounts on startup
    init_db()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="Student Outreach & Mantra Meditation Management API",
    description="Backend API for managing hostel outreach, student registration, attendance tracking, and follow-ups.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(students_router)
app.include_router(attendance_router)
app.include_router(sessions_router)
app.include_router(followups_router)
app.include_router(reports_router)
app.include_router(photo_students_router)

# Mount uploads directory for student photos
uploads_dir = settings.UPLOADS_DIR
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend status."""
    return {"status": "ok", "message": "Mantra Meditation Outreach System is operational"}

# Mount frontend static folders if frontend directory exists
frontend_path = settings.FRONTEND_DIR
if frontend_path.exists():
    css_path = frontend_path / "css"
    if css_path.exists():
        app.mount("/css", StaticFiles(directory=str(css_path)), name="css")
    js_path = frontend_path / "js"
    if js_path.exists():
        app.mount("/js", StaticFiles(directory=str(js_path)), name="js")
    assets_path = frontend_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    # Serve HTML views directly from backend for single-port convenience
    html_pages = [
        "index.html",
        "login.html",
        "dashboard.html",
        "students.html",
        "student-details.html",
        "register-student.html",
        "attendance.html",
        "sessions.html",
        "followups.html",
        "reports.html",
        "settings.html",
        "photo-directory.html",
    ]

    for page in html_pages:
        page_file = frontend_path / page
        route_name = page if page != "index.html" else ""
        
        # Handler factory to capture page_file
        def make_handler(p_file: Path):
            async def serve_page():
                if p_file.exists():
                    return FileResponse(p_file)
                return JSONResponse(status_code=404, content={"detail": f"{p_file.name} not found"})
            return serve_page

        # Serve with .html and clean URL without .html
        if page == "index.html":
            app.get("/", include_in_schema=False)(make_handler(page_file))
            app.get("/index.html", include_in_schema=False)(make_handler(page_file))
        else:
            clean_route = "/" + page.replace(".html", "")
            html_route = "/" + page
            app.get(clean_route, include_in_schema=False)(make_handler(page_file))
            app.get(html_route, include_in_schema=False)(make_handler(page_file))

    # Serve manifest and service worker from root
    @app.get("/manifest.json", include_in_schema=False)
    async def get_manifest():
        manifest_file = frontend_path / "assets" / "manifest.json"
        if manifest_file.exists():
            return FileResponse(manifest_file, media_type="application/manifest+json")
        return JSONResponse(status_code=404, content={"detail": "manifest.json not found"})

    @app.get("/sw.js", include_in_schema=False)
    async def get_service_worker():
        sw_file = frontend_path / "assets" / "sw.js"
        if sw_file.exists():
            return FileResponse(sw_file, media_type="application/javascript")
        return JSONResponse(status_code=404, content={"detail": "sw.js not found"})
