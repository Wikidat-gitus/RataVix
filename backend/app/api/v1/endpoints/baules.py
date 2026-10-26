from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query, status
from app.schemas.baul import BaulCreate, BaulResponse

router = APIRouter(prefix="/baules", tags=["Baúles (Carpetas Virtuales)"])


@router.get("", response_model=List[BaulResponse])
async def list_baules(baul_padre_id: Optional[UUID] = Query(default=None)):
    """
    Lista baúles virtuales. Filtra por baul_padre_id si se proporciona.
    """
    # Placeholder para Fase 1 compatible con contrato
    return [
        BaulResponse(
            id=uuid4(),
            nombre_cifrado="Q2FycGV0YSBQZXJzb25hbA==",
            iv="Z2l2ZXNvbWVpdlZhbDEy",
            baul_padre_id=baul_padre_id,
            creado_en=datetime.now(timezone.utc)
        )
    ]


@router.post("", response_model=BaulResponse, status_code=status.HTTP_201_CREATED)
async def create_baul(payload: BaulCreate):
    """
    Crea un nuevo baúl virtual cifrado en PostgreSQL.
    """
    return BaulResponse(
        id=uuid4(),
        nombre_cifrado=payload.nombre_cifrado,
        iv=payload.iv,
        baul_padre_id=payload.baul_padre_id,
        creado_en=datetime.now(timezone.utc)
    )
