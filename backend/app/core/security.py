import secrets
from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.usuario import Usuario

# Esquema Bearer
security_bearer = HTTPBearer(auto_error=False)


def generate_session_token() -> str:
    """Genera un token criptográficamente seguro para la sesión activa."""
    return secrets.token_urlsafe(32)


def set_user_active_session(db: Session, user: Usuario) -> str:
    """
    Asigna un nuevo token de sesión única al usuario y lo persiste en la base de datos.
    Cualquier sesión abierta previamente en otro dispositivo o pestaña queda invalidada.
    """
    token = generate_session_token()
    user.active_session_token = token
    db.add(user)
    db.commit()
    db.refresh(user)
    return token


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """
    Dependencia de FastAPI para obtener el usuario autenticado y hacer valer
    el Control de Sesión Única:
    1. Si se envía token, verifica que coincida exactamente con active_session_token.
    2. Si no coincide, rechaza con HTTP 401 (sesión cerrada o expirada).
    3. Si no se envía token, rechaza inmediatamente con HTTP 401 (autenticación obligatoria).
    """
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials

    if token:
        # Buscar usuario que posea este token activo
        user = db.query(Usuario).filter(Usuario.active_session_token == token).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión no válida o cerrada en otro dispositivo.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autenticación requerida.",
        headers={"WWW-Authenticate": "Bearer"},
    )
