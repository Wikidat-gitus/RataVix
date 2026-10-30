from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class GoogleAuthRequest(BaseModel):
    """Payload enviado por el frontend con el código de autorización OAuth o correo de Google."""
    code: Optional[str] = "mock_google_auth_code"
    email: Optional[str] = None
    google_id: Optional[str] = None


class UserPublic(BaseModel):
    id: UUID
    email: str
    tiene_clave_maestra: bool = False
    salt_cifrado: Optional[str] = None
    canary_cifrado: Optional[str] = None
    canary_iv: Optional[str] = None


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UserPublic


class SessionCheckResponse(BaseModel):
    """Respuesta para verificar si la sesión sigue activa y sin concurrencia."""
    activa: bool
    session_id: Optional[UUID] = None


class SetupMasterKeyRequest(BaseModel):
    """Registro inicial del salt y canario criptográfico del usuario."""
    salt_cifrado: str
    canary_cifrado: str
    canary_iv: str


class SetupMasterKeyResponse(BaseModel):
    ok: bool = True
    mensaje: str = "Clave maestra configurada con éxito"
    usuario: UserPublic


class ResetVaultRequest(BaseModel):
    """Confirmación explícita para purgar por completo el baúl y resetear la clave."""
    confirmacion: str = "BORRAR_TODO"


class ResetVaultResponse(BaseModel):
    ok: bool = True
    mensaje: str = "Baúl purgado y reseteado exitosamente"
    deleted_drive_file_ids: List[str]
