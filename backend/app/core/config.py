from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ruta absoluta al archivo .env dentro de backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # Por defecto SQLite para desarrollo inmediato sin dependencias de Docker;
    # En producción o cuando PostgreSQL esté activo se sobreescribe con postgresql+psycopg2://...
    DATABASE_URL: str = "sqlite:///./baul_magico.db"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/auth/callback"

    SECRET_KEY: str = "clave_de_desarrollo_insegura_cambiar_en_produccion_32_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(
        env_file=(".env", str(ENV_FILE_PATH)),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
