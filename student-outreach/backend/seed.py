"""
Seed script for Student Outreach & Mantra Meditation Management System.
Populates realistic students, sessions, attendance records, and follow-up logs.
"""
import sys
from pathlib import Path
from datetime import datetime, date, timedelta, timezone

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import Session, select
from app.database import engine, init_db
from app.models.user import User
from app.models.student import Student
from app.models.session import Session as MeditationSession
from app.models.attendance import Attendance
from app.models.followup import Followup

def seed_data():
    init_db()
    with Session(engine) as db:
        # Check if students already exist
        existing_count = db.exec(select(Student)).first()
        if existing_count:
            print("Database already contains student records. Skipping demo seed.")
            return

        admin = db.exec(select(User).where(User.username == "admin")).first()
        volunteer = db.exec(select(User).where(User.username == "volunteer")).first()
        admin_id = admin.id if admin else 1
        vol_id = volunteer.id if volunteer else admin_id

        now = datetime.now(timezone.utc)

        # 1. Create Initial Sessions
        sessions_data = [
            {
                "session_name": "Mind Detox & Sound Vibration Intro",
                "session_date": (date.today() - timedelta(days=21)).strftime("%Y-%m-%d"),
                "start_time": "18:30",
                "location": "Hostel 3 Common Hall",
                "description": "Introduction to the science of sound frequencies and mantra meditation for mental focus.",
                "created_by": admin_id
            },
            {
                "session_name": "Conquering Exam Stress through Japa",
                "session_date": (date.today() - timedelta(days=14)).strftime("%Y-%m-%d"),
                "start_time": "19:00",
                "location": "Hostel 1 Seminar Room",
                "description": "Practical meditation workshop focusing on overcoming exam anxiety and improving retention.",
                "created_by": vol_id
            },
            {
                "session_name": "Mindfulness & The Higher Taste",
                "session_date": (date.today() - timedelta(days=7)).strftime("%Y-%m-%d"),
                "start_time": "18:00",
                "location": "Hostel 2 Activity Center",
                "description": "Discussion on habits, mind control, and developing peaceful concentration.",
                "created_by": admin_id
            },
            {
                "session_name": "Weekly Mantra Circle & Kirtan Experience",
                "session_date": date.today().strftime("%Y-%m-%d"),
                "start_time": "18:30",
                "location": "Central Student Activity Hall",
                "description": "Interactive call-and-response musical meditation and guided japa beads session.",
                "created_by": vol_id
            },
            {
                "session_name": "Deep Focus Meditation & Wisdom Q&A",
                "session_date": (date.today() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "start_time": "19:00",
                "location": "Hostel 4 Recreation Room",
                "description": "Upcoming guided mindfulness and meditation session for engineering hostel residents.",
                "created_by": admin_id
            }
        ]

        created_sessions = []
        for s_data in sessions_data:
            s = MeditationSession(
                session_name=s_data["session_name"],
                session_date=s_data["session_date"],
                start_time=s_data["start_time"],
                location=s_data["location"],
                description=s_data["description"],
                created_by=s_data["created_by"],
                created_at=now - timedelta(days=25)
            )
            db.add(s)
            created_sessions.append(s)
        db.commit()
        for s in created_sessions:
            db.refresh(s)

        # 2. Create Realistic Students
        sample_students = [
            ("Aarav Sharma", "21BCE1042", "Room 204", "Computer Science", "+919876543210", "Hostel 1 - Ramanujan Hall", True, "regular", True),
            ("Rohan Verma", "21BME1088", "Room 312", "Mechanical Eng", "+919812345678", "Hostel 1 - Ramanujan Hall", True, "regular", True),
            ("Aditya Patel", "22ECE1120", "Room 105", "Electronics & Comm", "+919823456789", "Hostel 2 - Kalam Bhavan", True, "interested", True),
            ("Siddharth Gupta", "22BCE1155", "Room 418", "Computer Science", "+919834567890", "Hostel 2 - Kalam Bhavan", True, "regular", True),
            ("Vikram Rao", "21BEE1077", "Room 220", "Electrical Eng", "+919845678901", "Hostel 3 - Aryabhata Hostel", True, "interested", True),
            ("Aniket Deshmukh", "23BCS1201", "Room 112", "Computer Science", "+919856789012", "Hostel 3 - Aryabhata Hostel", True, "new", True),
            ("Rahul Nair", "22BCE1190", "Room 305", "Civil Eng", "+919867890123", "Hostel 4 - Vivekananda Nilayam", False, "inactive", True),
            ("Kunal Singhania", "21BIT1034", "Room 214", "Information Tech", "+919878901234", "Hostel 4 - Vivekananda Nilayam", True, "interested", True),
            ("Devendra Joshi", "23BME1244", "Room 108", "Mechanical Eng", "+919889012345", "Hostel 1 - Ramanujan Hall", True, "new", True),
            ("Manish Tiwari", "22BCE1182", "Room 310", "Computer Science", "+919890123456", "Hostel 2 - Kalam Bhavan", True, "regular", True),
            ("Prashant Mishra", "21BCH1015", "Room 402", "Chemical Eng", "+919901234567", "Hostel 3 - Aryabhata Hostel", False, "inactive", False),
            ("Gaurav Kulkarni", "23BEE1289", "Room 215", "Electrical Eng", "+919912345678", "Hostel 4 - Vivekananda Nilayam", True, "interested", True),
        ]

        created_students = []
        for name, reg, room, branch, phone, hostel, interested, status, consent in sample_students:
            student = Student(
                name=name,
                registration_number=reg,
                room_number=room,
                branch=branch,
                phone_number=phone,
                hostel_name=hostel,
                interested=interested,
                status=status,
                consent_to_contact=consent,
                registered_by=vol_id,
                created_at=now - timedelta(days=22),
                updated_at=now - timedelta(days=2)
            )
            db.add(student)
            created_students.append(student)
        db.commit()
        for s in created_students:
            db.refresh(s)

        # 3. Create Attendance Records for Past Sessions
        past_sessions = created_sessions[:4]
        # Regular students attend most, interested attend some, inactive miss
        for sess_idx, sess in enumerate(past_sessions):
            for st_idx, st in enumerate(created_students):
                # Pattern based on status
                if st.status == "regular":
                    st_status = "present" if (st_idx + sess_idx) % 5 != 0 else "absent"
                elif st.status == "interested":
                    st_status = "present" if (st_idx + sess_idx) % 2 == 0 else "absent"
                elif st.status == "new":
                    st_status = "present" if sess_idx == 3 else "absent"
                else:  # inactive
                    st_status = "absent"

                att = Attendance(
                    student_id=st.id,
                    session_id=sess.id,
                    attendance_status=st_status,
                    marked_by=vol_id,
                    marked_at=now - timedelta(days=(21 - sess_idx * 7))
                )
                db.add(att)
        db.commit()

        # 4. Create Follow-up Records
        followups_data = [
            (
                created_students[2].id,  # Aditya Patel
                "contacted",
                "Spoke warmly about the previous session. Very keen on attending the weekend kirtan circle.",
                (date.today() + timedelta(days=3)).strftime("%Y-%m-%d"),
                vol_id
            ),
            (
                created_students[4].id,  # Vikram Rao
                "interested",
                "Requested japa beads and mantra meditation audio track. Will visit his room on Tuesday.",
                (date.today() + timedelta(days=2)).strftime("%Y-%m-%d"),
                vol_id
            ),
            (
                created_students[6].id,  # Rahul Nair (inactive)
                "not_reachable",
                "Called twice, phone went unanswered. Will try again before the upcoming session.",
                (date.today() + timedelta(days=1)).strftime("%Y-%m-%d"),
                admin_id
            ),
            (
                created_students[7].id,  # Kunal Singhania
                "contacted",
                "Had lab submissions last week so could not attend. Confirmed participation for the next session.",
                (date.today() + timedelta(days=5)).strftime("%Y-%m-%d"),
                vol_id
            )
        ]

        for st_id, status, notes, next_date, created_by in followups_data:
            fu = Followup(
                student_id=st_id,
                contact_date=now - timedelta(days=3),
                contact_status=status,
                notes=notes,
                next_followup_date=next_date,
                created_by=created_by,
                created_at=now - timedelta(days=3)
            )
            db.add(fu)
        db.commit()

        print(f"Successfully seeded {len(created_sessions)} sessions, {len(created_students)} students, attendances, and follow-ups!")

if __name__ == "__main__":
    seed_data()
