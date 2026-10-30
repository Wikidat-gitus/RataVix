import logging
from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.usuario import Usuario
import app.models  # Asegurar registro de todos los modelos

logger = logging.getLogger(__name__)


def init_db() -> None:
    """
    Crea las tablas en la base de datos si no existen aún y aplica migraciones
    ligeras seguras para nuevas columnas (salt_cifrado, canary_cifrado, canary_iv).
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos creadas/verificadas con éxito.")

        # Migración ligera segura de columnas para usuarios existentes
        with engine.connect() as conn:
            is_postgres = "postgres" in str(engine.url)
            columns = [
                ("salt_cifrado", "VARCHAR(255)"),
                ("canary_cifrado", "VARCHAR(512)"),
                ("canary_iv", "VARCHAR(255)"),
            ]
            for col_name, col_type in columns:
                try:
                    if is_postgres:
                        conn.execute(
                            text(f"ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                        )
                    else:
                        # SQLite no soporta IF NOT EXISTS en ADD COLUMN; capturamos si ya existe
                        conn.execute(
                            text(f"ALTER TABLE usuarios ADD COLUMN {col_name} {col_type};")
                        )
                    conn.commit()
                except Exception:
                    # Columna ya existente o ignorada
                    pass

        with SessionLocal() as db:
            demo_email = "usuario.demo@baulmagico.local"
            demo_user = db.query(Usuario).filter(Usuario.email == demo_email).first()
            if not demo_user:
                demo_user = Usuario(
                    email=demo_email,
                    google_id="demo_google_id_12345",
                    active_session_token="mock_backend_session_token_12345",
                )
                db.add(demo_user)
                db.commit()
                logger.info("Usuario demo inicial creado satisfactoriamente.")
    except Exception as e:
        logger.error(f"Error al inicializar la base de datos: {e}")
