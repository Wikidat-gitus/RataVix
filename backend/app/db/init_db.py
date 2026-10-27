import logging
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.usuario import Usuario
import app.models  # Asegurar registro de todos los modelos

logger = logging.getLogger(__name__)


def init_db() -> None:
    """
    Crea las tablas en la base de datos si no existen aún y siembra el usuario demo inicial
    en desarrollo.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos creadas/verificadas con éxito.")

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
