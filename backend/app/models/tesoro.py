import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Uuid, ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario
    from app.models.baul import Baul


class Tesoro(Base):
    __tablename__ = "tesoros"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    baul_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("baules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Puntero directo al archivo encriptado en Google Drive del usuario
    drive_file_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    # Metadatos Cifrados en Cliente (Zero-Knowledge)
    nombre_cifrado: Mapped[str] = mapped_column(
        String(512), nullable=False
    )
    iv: Mapped[str] = mapped_column(
        String(128), nullable=False
    )
    tamano_bytes: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0
    )
    tipo_mime: Mapped[str] = mapped_column(
        String(128), nullable=False, default="application/octet-stream"
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="tesoros")
    baul: Mapped["Baul"] = relationship("Baul", back_populates="tesoros")

    def __repr__(self) -> str:
        return f"<Tesoro {self.id} (drive: {self.drive_file_id})>"
