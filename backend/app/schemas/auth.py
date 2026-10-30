from uuid import UUID
from typing import Optional
from pydantic import BaseModel, EmailStr


class GoogleAuthRequest(BaseModel):
    """Payload enviado por el frontend con el código de autorización OAuth o correo de Google."""
    code: Optional[str] = "mock_google_auth_code"
    email: Optional[str] = None
    google_id: Optional[str] = None


class UserPublic(BaseModel):
    id: UUID
    email: str


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UserPublic


class SessionCheckResponse(BaseModel):
    """Respuesta para verificar si la sesión sigue activa y sin concurrencia."""
    activa: bool
    session_id: Optional[UUID] = None
