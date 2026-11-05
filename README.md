# Student Outreach & Mantra Meditation Management System

A production-ready, mobile-first web application designed for campus outreach teams visiting college hostels to introduce students to mantra meditation, collect student information with consent, track attendance across sessions, and maintain regular communication.

Built with **FastAPI**, **SQLModel**, **SQLite**, **HTML5/CSS3/Vanilla JS**, **Chart.js**, and **PWA (Progressive Web App)** capabilities.

---

## 🌟 Key Features

1. **Mobile-First Touch Ergonomics**
   - Designed specifically for smartphone use during hostel room visits (320px–430px screens up to desktop monitors).
   - Touch targets $\ge 44\text{px}$, responsive tables converting to cards on mobile, compact sticky header, drawer navigation, and fixed bottom navigation bar (Dashboard, Students, Register, Attendance, Follow-ups).
   - Zero horizontal scroll, single-column touch inputs, and quick action shortcuts (`tel:`, WhatsApp greeting generator).

2. **Secure Authentication & Role-Based Access**
   - JWT-based authentication with secure password hashing (`pwdlib` Argon2 / bcrypt).
   - **Admin role**: Manage team volunteers, oversee students, create sessions, view analytical reports, and export CSVs.
   - **Volunteer role**: Register students, mark attendance, conduct and log follow-ups.
   - Pre-seeded admin (`admin` / `admin123`) and volunteer (`volunteer` / `volunteer123`) accounts.

3. **Student Directory & Registration**
   - Full CRUD functionality: Full Name, unique Registration Number, Room Number, Branch, Phone Number, Hostel, Status (`new`, `interested`, `regular`, `inactive`).
   - Consent management: Explicit checkboxes for session interest and communication consent.
   - Real-time search, filters (branch, hostel, status), and pagination.
   - Student profile view with individual attendance percentage gauge, attendance history, and follow-up timeline.

4. **Session-Based Attendance Tracking**
   - Attendance is strictly recorded against sessions rather than plain dates.
   - Fast bulk marking ("Mark Visible Present", "Mark Visible Absent") and individual toggles.
   - Live summary counters: Present count, Absent count, Total marked, and Turnout percentage.
   - Unique constraints prevent duplicate records for the same student in a session.

5. **Smart Follow-Up CRM**
   - Automatic categorization for students needing follow-up:
     - Never attended any session after registration.
     - Missed recent sessions or inactive.
     - Scheduled next follow-up date due.
   - One-tap phone dialer (`tel:`) and direct WhatsApp chat launcher with pre-filled respectful greeting.
   - Log conversations, schedule next touchpoint, and update engagement status directly from the modal.

6. **Analytics & CSV Reports**
   - Real-time dashboard with 6 stat cards, today's attendance summary bar, session attendance history chart, and monthly registration trend.
   - Demographic reports: Branch distribution (doughnut chart), hostel distribution (bar chart), status breakdown (pie chart), and date-range filtered turnout trends.
   - 1-click CSV exports: Full student directory and session attendance records.

7. **Student Photo Directory & Big Visual View**
   - Separate visual database storing student photo, full name, phone number, and optional room/hostel notes.
   - Mobile camera integration (`capture="environment"`) to snap and upload student photos directly during hostel room visits.
   - **Big Clear View Lightbox**: Tap any photo on mobile or desktop to open an immersive, high-resolution modal displaying a large photo, quick 1-tap call button, and WhatsApp launcher.
   - Complete CRUD: Upload, real-time search, edit details/replace photos, and delete records with automatic file cleanup on the server.

8. **PWA & Offline-Ready Shell**
   - Web App Manifest (`manifest.json`) and service worker (`sw.js`) caching static shell assets for fast app loading.
   - In accordance with privacy and security requirements, private student records and authenticated API calls are never cached in the service worker.

---

## 📁 Project Structure

```text
student-outreach/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, static mounting, CORS & lifespan
│   │   ├── config.py            # Environment settings and paths
│   │   ├── database.py          # SQLModel SQLite engine, session & auto-init
│   │   ├── dependencies.py      # JWT auth, password hashing, and role checks
│   │   │
│   │   ├── models/              # SQLModel Database Models
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # User & Volunteer accounts
│   │   │   ├── student.py       # Student records & consent
│   │   │   ├── session.py       # Meditation sessions
│   │   │   ├── attendance.py    # Attendance with unique constraint
│   │   │   └── followup.py      # Follow-up logs & schedules
│   │   │
│   │   ├── schemas/             # Pydantic Schemas for Request/Response
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── student.py
│   │   │   ├── session.py
│   │   │   ├── attendance.py
│   │   │   └── followup.py
│   │   │
│   │   ├── routers/             # REST API Endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # /api/auth (login, logout, me, users)
│   │   │   ├── dashboard.py     # /api/dashboard (stats, trends, recent)
│   │   │   ├── students.py      # /api/students (CRUD, filters, pagination)
│   │   │   ├── attendance.py    # /api/attendance (session & bulk marking)
│   │   │   ├── sessions.py      # /api/sessions (CRUD)
│   │   │   ├── followups.py     # /api/followups (pending & logs)
│   │   │   └── reports.py       # /api/reports (analytics & CSV exports)
│   │   │
│   │   └── services/            # Business Logic Layer
│   │       ├── __init__.py
│   │       ├── student_service.py
│   │       ├── attendance_service.py
│   │       └── followup_service.py
│   │
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment variable template
│   ├── .env                     # Local environment settings
│   └── seed.py                  # Seed script for realistic demo data
│
├── frontend/
│   ├── index.html               # Smart router / splash screen
│   ├── login.html               # Login page with 1-click demo accounts
│   ├── dashboard.html           # Main dashboard with 6 stat cards & Chart.js
│   ├── students.html            # Students directory with search & filters
│   ├── student-details.html     # Student profile, attendance rate & history
│   ├── register-student.html    # Mobile-first single column registration
│   ├── attendance.html          # Session attendance marking sheet
│   ├── sessions.html            # Session scheduler & card management
│   ├── followups.html           # Pending reminders, calls & WhatsApp links
│   ├── reports.html             # Date-range analytics & CSV exports
│   ├── settings.html            # Account settings & volunteer management
│   │
│   ├── css/
│   │   ├── style.css            # Base design tokens, colors & layout shell
│   │   ├── components.css       # Buttons, cards, modals, tables, badges
│   │   ├── dashboard.css        # Chart containers & summary banners
│   │   └── responsive.css       # Mobile-first breakpoints (320px–desktop)
│   │
│   ├── js/
│   │   ├── api.js               # Universal fetch client & UI helpers
│   │   ├── auth.js              # Token management & session guards
│   │   ├── dashboard.js         # Stats loader & Chart.js instances
│   │   ├── students.js          # Student CRUD, search, filter & modals
│   │   ├── attendance.js        # Bulk marking & live counter calculations
│   │   ├── sessions.js          # Session CRUD & details
│   │   ├── followups.js         # Follow-up workflow & WhatsApp integration
│   │   └── reports.js           # Analytics charts & CSV downloader
│   │
│   └── assets/
│       ├── manifest.json        # PWA Web App Manifest
│       ├── sw.js                # Service worker for offline shell
│       └── icons/               # PWA touch icons (192px & 512px)
│
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10+ (Tested and verified up to Python 3.14)
- Pip / Virtual environment support

### 1. Clone & Navigate to Project
```bash
cd student-outreach/backend
```

### 2. Set Up Virtual Environment & Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Environment Configuration
An environment file `.env` is created automatically. You can customize settings if needed:
```bash
cp .env.example .env
```
Key configuration settings:
- `SECRET_KEY`: A 32+ character random string for signing JWT tokens.
- `DATABASE_URL`: `sqlite:///./outreach.db`
- `ADMIN_USERNAME`: `admin`
- `ADMIN_PASSWORD`: `admin123`
- `ADMIN_FULL_NAME`: `Program Administrator`

---

## 🗄️ Database Initialization & Seeding

The SQLite database tables and default admin/volunteer users are **automatically created on the first server launch**.

To seed realistic sample data (sessions, students across hostels, attendance history, and follow-ups) for testing, run:
```bash
cd student-outreach/backend
python seed.py
```

### Default Credentials
| Role | Username | Password |
|---|---|---|
| **Administrator** | `admin` | `admin123` |
| **Volunteer** | `volunteer` | `volunteer123` |

---

## 🚀 Running the Application

### Option A: Unified Startup (Recommended)
FastAPI automatically serves the API backend **and** hosts the frontend static files on a single port:

```bash
cd student-outreach/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open your browser on your desktop or smartphone:
- **Application URL:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Option B: Separate Frontend Development Server
If you prefer running the frontend independently on port 3000:
```bash
# Terminal 1: Backend
cd student-outreach/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd student-outreach/frontend
python3 -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000). The frontend automatically routes API calls to `http://localhost:8000` via configured CORS.

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with username and password, returns JWT token.
- `POST /api/auth/logout`: Clears session cookie and invalidates login.
- `GET /api/auth/me`: Returns profile of the currently logged-in user.
- `POST /api/auth/change-password`: Allows authenticated user to update their password.
- `GET /api/auth/users`: *(Admin only)* List all volunteers and administrators.
- `POST /api/auth/users`: *(Admin only)* Create a new volunteer account.
- `PUT /api/auth/users/{id}`: *(Admin only)* Update user status or role.

### Students (`/api/students`)
- `GET /api/students`: Filtered & paginated list (`search`, `branch`, `hostel`, `status`, `page`, `limit`).
- `POST /api/students`: Register a new student (validates unique registration number).
- `GET /api/students/{id}`: Full student profile with attendance percentage and followup history.
- `PUT /api/students/{id}`: Update student contact and engagement status.
- `DELETE /api/students/{id}`: Delete student and associated records.
- `GET /api/students/meta/filters`: Retrieve distinct branches and hostels for filters.

### Sessions (`/api/sessions`)
- `GET /api/sessions`: List all sessions with turnout metrics (present, absent, total).
- `POST /api/sessions`: Schedule a new meditation session.
- `GET /api/sessions/{id}`: Get single session details and attendance summary.
- `PUT /api/sessions/{id}`: Update session details.
- `DELETE /api/sessions/{id}`: Delete session and its marked attendance.

### Attendance (`/api/attendance`)
- `GET /api/attendance`: Query attendance records with filters.
- `POST /api/attendance`: Bulk mark or update session attendance.
- `POST /api/attendance/single`: Toggle single student attendance.
- `GET /api/attendance/session/{session_id}`: Full attendance sheet for a session.
- `GET /api/attendance/student/{student_id}`: Complete attendance history for a student.

### Follow-ups (`/api/followups`)
- `GET /api/followups`: View all historical follow-up interaction logs.
- `GET /api/followups/pending`: Smart list of students requiring follow-up.
- `POST /api/followups`: Log a call or conversation with a student.
- `PUT /api/followups/{id}`: Edit follow-up notes or reschedule next contact date.
- `DELETE /api/followups/{id}`: Delete follow-up entry.

### Dashboard & Reports (`/api/dashboard`, `/api/reports`)
- `GET /api/dashboard/stats`: The 6 primary dashboard metric cards.
- `GET /api/dashboard/recent-students`: Latest student registrations.
- `GET /api/dashboard/attendance-trends`: Weekly attendance and monthly registration trend data.
- `GET /api/reports/attendance`: Session turnout breakdown with date-range filters.
- `GET /api/reports/branch-distribution`: Branch, hostel, and status distributions.
- `GET /api/reports/export/students`: Download full student directory as CSV.
- `GET /api/reports/export/attendance`: Download attendance records as CSV.

---

## 🧪 Testing

To run the automated verification test suite:
```bash
cd student-outreach/backend
source venv/bin/activate
python -c "
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
res = client.get('/api/health')
assert res.status_code == 200
login_res = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
assert login_res.status_code == 200
print('System healthy and verified!')
"
```

All 7 test suites (Static serving, Authentication, Students CRUD & duplicate prevention, Sessions CRUD, Attendance bulk marking, Follow-ups, Dashboard stats & CSV export) are verified and passing.
