import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuario import Usuario
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
    1. Si se envía el email del usuario de Google, registra o asocia al usuario en Neon.
    2. Aplica CONTROL DE SESIÓN ÚNICA: Genera un nuevo token de sesión activo,
       invalidando automáticamente cualquier sesión previa del usuario.
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
        ),
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
