from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuario import Usuario
from app.models.baul import Baul
from app.models.tesoro import Tesoro
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
    todos: bool = Query(default=False),
    es_cifrado: Optional[bool] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista baúles virtuales pertenecientes al usuario autenticado.
    - Si es_cifrado no es None: filtra por Modo Secreto (True) o Modo Libre (False).
    - Si todos=True: lista todos los baúles del usuario (para resolver árboles y rutas).
    - Si todos=False y baul_padre_id=None: lista solo los baúles raíz.
    - Si todos=False y baul_padre_id={uuid}: lista los subbaúles hijos directos.
    """
    query = db.query(Baul).filter(Baul.usuario_id == current_user.id)
    if es_cifrado is not None:
        query = query.filter(Baul.es_cifrado == es_cifrado)

    if todos:
        return query.order_by(Baul.creado_en.asc()).all()

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
    Crea un nuevo baúl virtual en la base de datos para el usuario autenticado (Modo Libre o Secreto).
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
        iv=payload.iv or "",
        es_cifrado=payload.es_cifrado,
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
    Retorna la lista de `deleted_drive_file_ids` de todos los tesoros hijos
    y descendientes para que el cliente pueda eliminarlos de Google Drive.
    Optimizado: Resuelve la jerarquía en 1 sola consulta SQL sin bucles N+1.
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

    # 1. Obtener todos los baúles del usuario en una sola consulta ligera (evita N+1 queries)
    user_baules = (
        db.query(Baul.id, Baul.baul_padre_id)
        .filter(Baul.usuario_id == current_user.id)
        .all()
    )

    # 2. Construir mapa de adyacencia de hijos en memoria
    children_map = {}
    for b_id, p_id in user_baules:
        if p_id:
            children_map.setdefault(p_id, []).append(b_id)

    # 3. Recorrer el subárbol en memoria instantáneamente
    all_descendant_baul_ids = set()
    queue = [baul.id]
    while queue:
        curr = queue.pop()
        all_descendant_baul_ids.add(curr)
        if curr in children_map:
            queue.extend(children_map[curr])

    # 4. Recolectar todos los drive_file_ids de tesoros dentro de la jerarquía (1 sola consulta SQL)
    drive_ids_records = (
        db.query(Tesoro.drive_file_id)
        .filter(
            Tesoro.baul_id.in_(all_descendant_baul_ids),
            Tesoro.usuario_id == current_user.id,
        )
        .all()
    )
    deleted_drive_file_ids = list(
        dict.fromkeys(r[0] for r in drive_ids_records if r[0])
    )

    # 5. Eliminar el baúl en la base de datos (cascade borra subbaúles y tesoros)
    db.delete(baul)
    db.commit()

    return BaulDeleteResponse(
        ok=True,
        mensaje="Baúl eliminado con éxito",
        deleted_drive_file_ids=deleted_drive_file_ids,
    )
