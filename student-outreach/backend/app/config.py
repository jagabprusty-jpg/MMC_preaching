import os
from pathlib import Path

# Base path for backend
BASE_DIR = Path(__file__).resolve().parent.parent

# Read .env if exists
env_path = BASE_DIR / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())

class Settings:
    def __init__(self):
        self.BASE_DIR: Path = BASE_DIR
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.HOST: str = os.getenv("HOST", "0.0.0.0")
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        
        # Security & JWT
        self.SECRET_KEY: str = os.getenv(
            "SECRET_KEY", 
            "c3R1ZGVudF9vdXRyZWFjaF9tYW50cmFfbWVkaXRhdGlvbl8zMmNoYXJzISE"
        )
        self.ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
        
        # Database URL
        db_path = BASE_DIR / "outreach.db"
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")
        
        # Uploads Directory (configurable for persistent disks)
        upload_path_env = os.getenv("UPLOADS_DIR")
        if upload_path_env:
            self.UPLOADS_DIR: Path = Path(upload_path_env)
        else:
            self.UPLOADS_DIR: Path = BASE_DIR / "uploads"
        
        # Default Admin Credentials
        self.ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
        self.ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
        self.ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@mantraoutreach.org")
        self.ADMIN_FULL_NAME: str = os.getenv("ADMIN_FULL_NAME", "Program Administrator")

        # Frontend Path
        self.FRONTEND_DIR: Path = BASE_DIR.parent / "frontend"

settings = Settings()
