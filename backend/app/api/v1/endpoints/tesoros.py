from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuario import Usuario
from app.models.baul import Baul
from app.models.tesoro import Tesoro
from app.core.security import get_current_user
from app.schemas.tesoro import (
    TesoroCreate,
    TesoroUpdate,
    TesoroResponse,
    TesoroDeleteResponse,
)

router = APIRouter(prefix="/tesoros", tags=["Tesoros (Archivos Virtuales en Drive)"])


@router.get("", response_model=List[TesoroResponse])
async def list_tesoros(
    baul_id: Optional[UUID] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista metadatos de archivos cifrados asociados a un baúl (o a la raíz si baul_id es None).
    """
    query = db.query(Tesoro).filter(Tesoro.usuario_id == current_user.id)
    if baul_id is not None:
        baul = (
            db.query(Baul)
            .filter(Baul.id == baul_id, Baul.usuario_id == current_user.id)
            .first()
        )
        if not baul:
            return []
        query = query.filter(Tesoro.baul_id == baul_id)
    else:
        query = query.filter(Tesoro.baul_id.is_(None))

    return query.order_by(Tesoro.creado_en.asc()).all()


@router.post("", response_model=TesoroResponse, status_code=status.HTTP_201_CREATED)
async def create_tesoro(
    payload: TesoroCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registra el metadato del archivo subido a Google Drive (Zero-Knowledge).
    Soporta archivos en un baúl específico o directamente en la raíz de la bóveda.
    """
    if payload.baul_id is not None:
        baul = (
            db.query(Baul)
            .filter(Baul.id == payload.baul_id, Baul.usuario_id == current_user.id)
            .first()
        )
        if not baul:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El baúl contenedor especificado no existe o no pertenece al usuario.",
            )

    nuevo_tesoro = Tesoro(
        usuario_id=current_user.id,
        baul_id=payload.baul_id,
        drive_file_id=payload.drive_file_id,
        nombre_cifrado=payload.nombre_cifrado,
        iv=payload.iv,
        tamano_bytes=payload.tamano_bytes,
        tipo_mime=payload.tipo_mime,
    )
    db.add(nuevo_tesoro)
    db.commit()
    db.refresh(nuevo_tesoro)
    return nuevo_tesoro


@router.put("/{id}", response_model=TesoroResponse)
async def update_tesoro(
    id: UUID,
    payload: TesoroUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza el nombre cifrado del tesoro o lo reubica en otro baúl (o a la raíz).
    """
    tesoro = (
        db.query(Tesoro)
        .filter(Tesoro.id == id, Tesoro.usuario_id == current_user.id)
        .first()
    )
    if not tesoro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tesoro no encontrado.",
        )

    if "baul_id" in payload.model_fields_set:
        if payload.baul_id is not None:
            nuevo_baul = (
                db.query(Baul)
                .filter(Baul.id == payload.baul_id, Baul.usuario_id == current_user.id)
                .first()
            )
            if not nuevo_baul:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="El nuevo baúl de destino no existe.",
                )
        tesoro.baul_id = payload.baul_id

    if payload.nombre_cifrado is not None:
        tesoro.nombre_cifrado = payload.nombre_cifrado
    if payload.iv is not None:
        tesoro.iv = payload.iv

    db.add(tesoro)
    db.commit()
    db.refresh(tesoro)
    return tesoro


@router.delete("/{id}", response_model=TesoroDeleteResponse)
async def delete_tesoro(
    id: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Elimina el metadato del tesoro en la base de datos virtual.
    """
    tesoro = (
        db.query(Tesoro)
        .filter(Tesoro.id == id, Tesoro.usuario_id == current_user.id)
        .first()
    )
    if not tesoro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tesoro no encontrado.",
        )

    db.delete(tesoro)
    db.commit()
    return TesoroDeleteResponse(ok=True, mensaje="Tesoro eliminado con éxito")
