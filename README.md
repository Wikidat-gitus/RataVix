# 🐀 RataVix

Aplicación web moderna de almacenamiento privado en Google Drive con arquitectura dual: **Modo Libre** (sin fricción) y **Modo Secreto** con arquitectura de **Conocimiento Cero (Zero-Knowledge)** y cifrado en el cliente (**Client-Side Encryption**).

---

## 🌐 Enlaces de Producción ($0/mes)
* **Frontend (Vercel):** [https://ratavix.vercel.app](https://ratavix.vercel.app) *(o https://baul-magico-2.vercel.app)*
* **Backend API (Render):** [https://baul-magico-2-api-9e9p.onrender.com](https://baul-magico-2-api-9e9p.onrender.com/health)
* **Base de Datos (Neon):** PostgreSQL Serverless (AWS US-East Virginia)

---

## 🏛️ Arquitectura Monorepo
Este repositorio agrupa tanto el cliente web como el servidor API y la documentación compartida:

```text
RataVix/
├── AGENTS.md            # Arnés general y reglas permanentes para agentes de IA
├── CHECKPOINT.md        # Memoria viva del proyecto, bitácora y siguientes pasos
├── README.md            # Portada general del repositorio
├── .gitignore           # Exclusiones de Git (Node.js + Python)
│
├── frontend/            # Cliente Web (React + Vite) — Despliegue en Vercel
├── backend/             # Servidor API (FastAPI + PostgreSQL) — Despliegue en Render
└── docs/                # Documentación compartida y contratos de API
    ├── ARCHITECTURE.md      # Arquitectura Zero-Knowledge y Principios SOLID
    ├── SETUP_AND_OPERATIONS.md # Guía de puesta en marcha, variables y despliegue
    └── API_CONTRACT.md      # Especificación de endpoints y modelos de datos
```

---

## 📖 Documentación del Sistema
Para entender a fondo el diseño o levantar tu propia instancia, consulta:
* 🏛️ **[Arquitectura y Criptografía Zero-Knowledge](docs/ARCHITECTURE.md):** Diagramas de secuencia, Web Crypto API nativa, derivación PBKDF2/AES-GCM y aplicación de principios SOLID.
* 🛠️ **[Guía de Puesta en Marcha y Operaciones](docs/SETUP_AND_OPERATIONS.md):** Manual paso a paso para ejecutar en local y desplegar en la nube ($0/mes) en Google Cloud, Neon, Render y Vercel.
* 📑 **[Contrato de API REST](docs/API_CONTRACT.md):** Especificación completa de endpoints, esquemas Pydantic y códigos de respuesta HTTP.
* 🧭 **[Bitácora de Desarrollo](CHECKPOINT.md):** Historial evolutivo y registro de decisiones de ingeniería.

---

## 🚀 Características Principales
- **Arquitectura Dual Dinámica:**
  - **🔓 Modo Libre:** Acceso directo tras login con Google sin contraseña maestra; guarda tus archivos estándar en `RataVix - Free Files` en tu Google Drive.
  - **🔒 Modo Secreto:** Bóveda de Conocimiento Cero; cifra archivos en RAM con **AES-GCM (256 bits)** antes de subirlos a `RataVix - Secret Files` en Google Drive.
- **Puente de Migración Atómica:** Arrastra archivos entre pestañas para blindarlos o liberarlos al instante con re-cifrado y actualización en nube.
- **Clave Maestra Efímera:** En Modo Secreto, la clave PBKDF2/AES vive únicamente en la memoria RAM volátil del navegador; nunca se envía por red ni se guarda en disco.
- **Direct-to-Storage con Telemetría:** Subidas y descargas directas a Google Drive con porcentaje de avance, velocidad en tiempo real (MB/s) y HUD gamer animado.
- **Prevención de Duplicados & Buscador:** Detección automática al estilo explorador nativo (`archivo (1).ext`) y filtrado en tiempo real en la barra superior.
- **Temas Visuales:** Selector entre diseño **Moderno** (mosaicos limpios) y **Pixel Art** (retro con desplazamiento lateral suave).

---

## 🛠️ Tecnologías
- **Frontend:** React 18, Vite, Vanilla CSS con modo oscuro y tema retro pixel art.
- **Backend:** Python 3, FastAPI, SQLAlchemy 2.0, PostgreSQL (Neon Serverless), Uvicorn.
- **Seguridad y Cloud:** Web Crypto API nativa, Google Drive API v3, Google OAuth 2.0, Render & Vercel.
- **Memoria para Agentes de IA:** Bitácora en [CHECKPOINT.md](CHECKPOINT.md) para garantizar continuidad sin pérdida de contexto.
