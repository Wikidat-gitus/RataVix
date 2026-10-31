from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

# Normalizar URL de la base de datos
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
elif db_url.startswith("sqlite:///."):
    # Resolver ruta absoluta dentro de backend/ para evitar discrepancias de CWD
    rel_path = db_url.replace("sqlite:///.", "").lstrip("/\\")
    abs_db_path = (BACKEND_DIR / rel_path).resolve()
    db_url = f"sqlite:///{abs_db_path.as_posix()}"

# Parámetros según el motor de base de datos
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=not db_url.startswith("sqlite"),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependencia de FastAPI para inyectar una sesión de base de datos en cada request
    y garantizar su cierre limpio al finalizar.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
