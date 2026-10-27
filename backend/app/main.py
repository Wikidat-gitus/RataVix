from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar tablas y datos iniciales en la base de datos
    init_db()
    yield


app = FastAPI(
    title="Baúl Mágico 2 API",
    description="API para gestión de metadatos virtuales cifrados y flujo seguro de Google Drive (Arquitectura Zero-Knowledge).",
    version="0.1.0",
    lifespan=lifespan,
)

# Configuración de CORS para permitir la comunicación con el Frontend de Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Endpoint de comprobación rápida de salud del servicio (accesible en /health y /api/health)
@app.get("/health", tags=["Salud"])
@app.get("/api/health", tags=["Salud"])
async def health_check():
    return {
        "status": "ok",
        "app": "Baúl Mágico 2 API",
        "environment": settings.ENVIRONMENT,
    }


# Enrutador con el prefijo /api que contiene /auth, /baules y /tesoros
app.include_router(api_router)
