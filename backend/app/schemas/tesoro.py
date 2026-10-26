from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TesoroBase(BaseModel):
    baul_id: UUID
    drive_file_id: str
    nombre_cifrado: str
    iv: str
    tamano_bytes: int
    tipo_mime: str


class TesoroCreate(TesoroBase):
    pass


class TesoroResponse(TesoroBase):
    id: UUID
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
