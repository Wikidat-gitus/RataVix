from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TesoroBase(BaseModel):
    baul_id: Optional[UUID] = None
    drive_file_id: str
    nombre_cifrado: str
    iv: Optional[str] = None
    es_cifrado: bool = True
    tamano_bytes: int
    tipo_mime: str


class TesoroCreate(TesoroBase):
    pass


class TesoroUpdate(BaseModel):
    nombre_cifrado: Optional[str] = None
    iv: Optional[str] = None
    drive_file_id: Optional[str] = None
    es_cifrado: Optional[bool] = None
    baul_id: Optional[UUID] = None


class TesoroResponse(TesoroBase):
    id: UUID
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class TesoroDeleteResponse(BaseModel):
    ok: bool = True
    mensaje: str = "Tesoro eliminado"
