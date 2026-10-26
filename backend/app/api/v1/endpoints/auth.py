from uuid import uuid4
from fastapi import APIRouter
from app.schemas.auth import (
    GoogleAuthRequest,
    GoogleAuthResponse,
    UserPublic,
    SessionCheckResponse,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/google", response_model=GoogleAuthResponse)
async def auth_google(payload: GoogleAuthRequest):
    """
    Intercambia el código de autorización de Google por tokens de acceso.
    En Fase 1 retorna estructura mock compatible con el contrato de API.
    """
    return GoogleAuthResponse(
        access_token="mock_backend_session_token_12345",
        token_type="bearer",
        usuario=UserPublic(
            id=uuid4(),
            email="usuario.demo@baulmagico.local"
        )
    )


@router.get("/session-check", response_model=SessionCheckResponse)
async def check_session():
    """
    Verifica que la sesión siga activa y que no haya conexiones concurrentes.
    """
    return SessionCheckResponse(
        activa=True,
        session_id=uuid4()
    )
