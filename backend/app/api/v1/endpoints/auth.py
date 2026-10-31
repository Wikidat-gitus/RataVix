import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuario import Usuario
from app.models.baul import Baul
from app.models.tesoro import Tesoro
from app.core.config import settings
from app.core.security import (
    get_current_user,
    set_user_active_session,
    security_bearer,
)
from app.schemas.auth import (
    GoogleAuthRequest,
    GoogleAuthResponse,
    UserPublic,
    SessionCheckResponse,
    SetupMasterKeyRequest,
    SetupMasterKeyResponse,
    ResetVaultRequest,
    ResetVaultResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/google", response_model=GoogleAuthResponse)
async def auth_google(
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    """
    Autenticación con Google OAuth:
    1. Registra o asocia al usuario en Neon / PostgreSQL.
    2. Aplica CONTROL DE SESIÓN ÚNICA: Invalida sesiones previas.
    3. Devuelve si el usuario ya tiene configurada su clave maestra (salt + canario).
    """
    email = payload.email or "usuario.demo@baulmagico.local"
    google_id = payload.google_id or f"google_id_{email}"

    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user:
        user = Usuario(email=email, google_id=google_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    # Asignar nuevo token y revocar sesiones anteriores
    new_token = set_user_active_session(db, user)

    return GoogleAuthResponse(
        access_token=new_token,
        token_type="bearer",
        usuario=UserPublic(
            id=user.id,
            email=user.email,
            tiene_clave_maestra=user.tiene_clave_maestra,
            salt_cifrado=user.salt_cifrado,
            canary_cifrado=user.canary_cifrado,
            canary_iv=user.canary_iv,
        ),
    )


@router.post("/setup-master-key", response_model=SetupMasterKeyResponse)
async def setup_master_key(
    payload: SetupMasterKeyRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Guarda los parámetros de verificación Zero-Knowledge generados por el cliente:
    - salt_cifrado: Salt PBKDF2 del usuario.
    - canary_cifrado + canary_iv: Mensaje canario cifrado con AES-GCM 256 bits.
    El backend NUNCA conoce la contraseña ni la clave derivada.
    """
    current_user.salt_cifrado = payload.salt_cifrado
    current_user.canary_cifrado = payload.canary_cifrado
    current_user.canary_iv = payload.canary_iv

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return SetupMasterKeyResponse(
        ok=True,
        mensaje="Clave maestra configurada con éxito",
        usuario=UserPublic(
            id=current_user.id,
            email=current_user.email,
            tiene_clave_maestra=current_user.tiene_clave_maestra,
            salt_cifrado=current_user.salt_cifrado,
            canary_cifrado=current_user.canary_cifrado,
            canary_iv=current_user.canary_iv,
        ),
    )


@router.post("/reset-vault", response_model=ResetVaultResponse)
async def reset_vault(
    payload: ResetVaultRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Purgar el baúl completo del usuario y resetear su clave maestra (en caso de olvido):
    1. Recolecta todos los drive_file_ids de sus tesoros para purga en Google Drive.
    2. Elimina todas las carpetas virtuales (baules) y archivos (tesoros) en la base de datos.
    3. Resetea el salt y canario, permitiendo al usuario configurar una nueva clave.
    """
    if payload.confirmacion != "BORRAR_TODO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmación requerida. Debe enviar confirmacion: 'BORRAR_TODO'",
        )

    # Recolectar drive_file_ids para eliminarlos en Drive
    user_tesoros = db.query(Tesoro).filter(Tesoro.usuario_id == current_user.id).all()
    deleted_drive_file_ids = [t.drive_file_id for t in user_tesoros if t.drive_file_id]

    # Eliminar tesoros y baules del usuario
    db.query(Tesoro).filter(Tesoro.usuario_id == current_user.id).delete(synchronize_session=False)
    db.query(Baul).filter(Baul.usuario_id == current_user.id).delete(synchronize_session=False)

    # Limpiar parámetros de clave maestra
    current_user.salt_cifrado = None
    current_user.canary_cifrado = None
    current_user.canary_iv = None

    db.add(current_user)
    db.commit()

    return ResetVaultResponse(
        ok=True,
        mensaje="Baúl purgado y reseteado exitosamente",
        deleted_drive_file_ids=deleted_drive_file_ids,
    )


@router.get("/session-check", response_model=SessionCheckResponse)
async def check_session(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: Session = Depends(get_db),
):
    """
    Comprueba si el token enviado sigue siendo la sesión activa en el servidor.
    """
    if not credentials:
        return SessionCheckResponse(activa=False)

    token = credentials.credentials
    user = db.query(Usuario).filter(Usuario.active_session_token == token).first()
    if not user:
        return SessionCheckResponse(activa=False)

    return SessionCheckResponse(activa=True, session_id=user.id)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoca la sesión activa actual del usuario.
    """
    current_user.active_session_token = None
    db.add(current_user)
    db.commit()
    return {"message": "Sesión cerrada correctamente."}
