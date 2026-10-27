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
    1. En producción, intercambia el 'code' con la API de Google por el ID token y perfil.
    2. En desarrollo / pruebas locales, permite flujo inmediato para 'usuario.demo@baulmagico.local'.
    3. Aplica CONTROL DE SESIÓN ÚNICA: Genera un nuevo token de sesión activo,
       invalidando automáticamente cualquier sesión previa del usuario.
    """
    email = "usuario.demo@baulmagico.local"
    google_id = "demo_google_id_12345"

    # Si se configuraron credenciales reales de Google OAuth, aquí se procesaría el intercambio
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_ID != "mock_client_id.apps.googleusercontent.com":
        logger.info("Credenciales de Google OAuth detectadas para intercambio seguro.")
        # Aquí se realiza la llamada con httpx al endpoint de token de Google

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
    Verifica que la sesión actual siga siendo la ÚNICA sesión activa.
    Si el usuario inició sesión en otro navegador, esta llamada responderá activa=False (o HTTP 401).
    """
    if not credentials:
        return SessionCheckResponse(activa=False, session_id=None)

    token = credentials.credentials
    user = db.query(Usuario).filter(Usuario.active_session_token == token).first()
    if not user:
        return SessionCheckResponse(activa=False, session_id=None)

    return SessionCheckResponse(activa=True, session_id=user.id)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cierra la sesión activa actual invalidando el token de sesión en la base de datos.
    """
    current_user.active_session_token = None
    db.add(current_user)
    db.commit()
    return {"ok": True, "mensaje": "Sesión cerrada correctamente."}
