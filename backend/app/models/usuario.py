import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.baul import Baul
    from app.models.tesoro import Tesoro


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    google_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    # Control de Sesión Única: Solo la sesión con este token exacto está autorizada.
    # Si el usuario inicia sesión en otro dispositivo, se sobreescribe y la sesión anterior expira.
    active_session_token: Mapped[Optional[str]] = mapped_column(
        String(255), index=True, nullable=True
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones en cascada
    baules: Mapped[List["Baul"]] = relationship(
        "Baul", back_populates="usuario", cascade="all, delete-orphan"
    )
    tesoros: Mapped[List["Tesoro"]] = relationship(
        "Tesoro", back_populates="usuario", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Usuario {self.email}>"
