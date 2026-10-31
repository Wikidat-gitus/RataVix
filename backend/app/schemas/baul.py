from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class BaulBase(BaseModel):
    nombre_cifrado: str
    iv: Optional[str] = None
    es_cifrado: bool = True
    baul_padre_id: Optional[UUID] = None


class BaulCreate(BaulBase):
    pass


class BaulUpdate(BaseModel):
    nombre_cifrado: Optional[str] = None
    iv: Optional[str] = None
    baul_padre_id: Optional[UUID] = None


class BaulResponse(BaulBase):
    id: UUID
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class BaulDeleteResponse(BaseModel):
    ok: bool = True
    mensaje: str = "Baúl eliminado con éxito"
    deleted_drive_file_ids: List[str] = []
