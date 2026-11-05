from typing import Generator
from sqlmodel import SQLModel, create_engine, Session, select
from app.config import settings
from app.models.user import User

# Handle Render PostgreSQL URL prefix (postgres:// -> postgresql://)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Engine configuration
engine = create_engine(
    db_url,
    echo=False,
    connect_args=connect_args
)

def init_db(seed_sample_data: bool = False):
    """Create all tables and seed default admin user."""
    # Import all models to ensure metadata is populated
    import app.models  # noqa: F401
    
    SQLModel.metadata.create_all(engine)
    
    # Check if admin user exists, if not create default admin
    with Session(engine) as db:
        admin_user = db.exec(
            select(User).where(User.username == settings.ADMIN_USERNAME)
        ).first()
        
        if not admin_user:
            from app.dependencies import get_password_hash
            hashed_pwd = get_password_hash(settings.ADMIN_PASSWORD)
            default_admin = User(
                full_name=settings.ADMIN_FULL_NAME,
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                password_hash=hashed_pwd,
                role="admin",
                is_active=True
            )
            db.add(default_admin)
            
            # Also seed a default volunteer user for easy testing
            volunteer_user = db.exec(
                select(User).where(User.username == "volunteer")
            ).first()
            if not volunteer_user:
                vol_hashed = get_password_hash("volunteer123")
                default_volunteer = User(
                    full_name="Outreach Volunteer",
                    username="volunteer",
                    email="volunteer@mantraoutreach.org",
                    password_hash=vol_hashed,
                    role="volunteer",
                    is_active=True
                )
                db.add(default_volunteer)
            
            db.commit()

def get_session() -> Generator[Session, None, None]:
    """Dependency for providing a transactional SQLModel database session."""
    with Session(engine) as session:
        yield session
