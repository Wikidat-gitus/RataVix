import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario
    from app.models.tesoro import Tesoro


class Baul(Base):
    __tablename__ = "baules"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Cero Conocimiento: el servidor almacena solo el texto cifrado en Base64 y su IV
    nombre_cifrado: Mapped[str] = mapped_column(
        String(512), nullable=False
    )
    iv: Mapped[str] = mapped_column(
        String(128), nullable=False
    )
    # Jerarquía virtual: baul_padre_id es null para la raíz o el UUID del baúl contenedor
    baul_padre_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("baules.id", ondelete="CASCADE"), nullable=True, index=True
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
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="baules")
    baul_padre: Mapped[Optional["Baul"]] = relationship(
        "Baul", remote_side=[id], back_populates="subbaules"
    )
    subbaules: Mapped[List["Baul"]] = relationship(
        "Baul", back_populates="baul_padre", cascade="all, delete-orphan"
    )
    tesoros: Mapped[List["Tesoro"]] = relationship(
        "Tesoro", back_populates="baul", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Baul {self.id} (padre: {self.baul_padre_id})>"
