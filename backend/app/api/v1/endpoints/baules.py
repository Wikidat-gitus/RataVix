from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuario import Usuario
from app.models.baul import Baul
from app.core.security import get_current_user
from app.schemas.baul import (
    BaulCreate,
    BaulUpdate,
    BaulResponse,
    BaulDeleteResponse,
)

router = APIRouter(prefix="/baules", tags=["Baúles (Carpetas Virtuales)"])


@router.get("", response_model=List[BaulResponse])
async def list_baules(
    baul_padre_id: Optional[UUID] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista baúles virtuales pertenecientes al usuario autenticado.
    Filtra por baul_padre_id (o lista los de raíz si es None).
    """
    query = db.query(Baul).filter(Baul.usuario_id == current_user.id)
    if baul_padre_id is not None:
        query = query.filter(Baul.baul_padre_id == baul_padre_id)
    else:
        query = query.filter(Baul.baul_padre_id.is_(None))

    return query.order_by(Baul.creado_en.asc()).all()


@router.post("", response_model=BaulResponse, status_code=status.HTTP_201_CREATED)
async def create_baul(
    payload: BaulCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea un nuevo baúl virtual cifrado en la base de datos para el usuario autenticado.
    """
    if payload.baul_padre_id:
        padre = (
            db.query(Baul)
            .filter(
                Baul.id == payload.baul_padre_id,
                Baul.usuario_id == current_user.id,
            )
            .first()
        )
        if not padre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El baúl padre especificado no existe o no pertenece al usuario.",
            )

    nuevo_baul = Baul(
        usuario_id=current_user.id,
        nombre_cifrado=payload.nombre_cifrado,
        iv=payload.iv,
        baul_padre_id=payload.baul_padre_id,
    )
    db.add(nuevo_baul)
    db.commit()
    db.refresh(nuevo_baul)
    return nuevo_baul


@router.put("/{id}", response_model=BaulResponse)
async def update_baul(
    id: UUID,
    payload: BaulUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza el nombre cifrado o reubica el baúl (mover a otro baúl padre).
    """
    baul = (
        db.query(Baul)
        .filter(Baul.id == id, Baul.usuario_id == current_user.id)
        .first()
    )
    if not baul:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baúl no encontrado.",
        )

    # Validar que no se intente auto-anidar
    if payload.baul_padre_id is not None:
        if payload.baul_padre_id == id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un baúl no puede ser su propio padre.",
            )
        padre = (
            db.query(Baul)
            .filter(
                Baul.id == payload.baul_padre_id,
                Baul.usuario_id == current_user.id,
            )
            .first()
        )
        if not padre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El nuevo baúl contenedor no existe.",
            )

    if payload.nombre_cifrado is not None:
        baul.nombre_cifrado = payload.nombre_cifrado
    if payload.iv is not None:
        baul.iv = payload.iv
    if "baul_padre_id" in payload.model_fields_set:
        baul.baul_padre_id = payload.baul_padre_id

    db.add(baul)
    db.commit()
    db.refresh(baul)
    return baul


@router.delete("/{id}", response_model=BaulDeleteResponse)
async def delete_baul(
    id: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Elimina un baúl virtual y sus contenidos dependientes en cascada.
    """
    baul = (
        db.query(Baul)
        .filter(Baul.id == id, Baul.usuario_id == current_user.id)
        .first()
    )
    if not baul:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baúl no encontrado.",
        )

    db.delete(baul)
    db.commit()
    return BaulDeleteResponse(ok=True, mensaje="Baúl eliminado con éxito")
