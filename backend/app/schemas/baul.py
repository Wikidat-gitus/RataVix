from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BaulBase(BaseModel):
    nombre_cifrado: str
    iv: str
    baul_padre_id: Optional[UUID] = None


class BaulCreate(BaulBase):
    pass


class BaulResponse(BaulBase):
    id: UUID
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
