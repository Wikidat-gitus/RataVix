from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query, status
from app.schemas.tesoro import TesoroCreate, TesoroResponse

router = APIRouter(prefix="/tesoros", tags=["Tesoros (Archivos Virtuales en Drive)"])


@router.get("", response_model=List[TesoroResponse])
async def list_tesoros(baul_id: Optional[UUID] = Query(default=None)):
    """
    Lista metadatos de archivos cifrados asociados a un baúl.
    """
    if not baul_id:
        return []
    return [
        TesoroResponse(
            id=uuid4(),
            baul_id=baul_id,
            drive_file_id="1xYzDriveFileIdMockExample987654",
            nombre_cifrado="ZG9jdW1lbnRvX3NlY3JldG8ucGRm",
            iv="Z2l2ZXNvbWVpdlZhbDEy",
            tamano_bytes=1048576,
            tipo_mime="application/octet-stream",
            creado_en=datetime.now(timezone.utc)
        )
    ]


@router.post("", response_model=TesoroResponse, status_code=status.HTTP_201_CREATED)
async def create_tesoro(payload: TesoroCreate):
    """
    Registra en la base de datos el metadato del archivo subido a Google Drive.
    """
    return TesoroResponse(
        id=uuid4(),
        baul_id=payload.baul_id,
        drive_file_id=payload.drive_file_id,
        nombre_cifrado=payload.nombre_cifrado,
        iv=payload.iv,
        tamano_bytes=payload.tamano_bytes,
        tipo_mime=payload.tipo_mime,
        creado_en=datetime.now(timezone.utc)
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tesoro(id: UUID):
    """
    Elimina el registro virtual del tesoro en la base de datos.
    """
    return None
