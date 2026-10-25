# 🧙‍♂️ Baúl Mágico 2

Aplicación web de almacenamiento privado con arquitectura de **Conocimiento Cero (Zero-Knowledge)** y cifrado en el cliente (**Client-Side Encryption**).

---

## 🏛️ Arquitectura Monorepo
Este repositorio agrupa tanto el cliente web como el servidor API y la documentación compartida:

```text
Baul_Magico_2/
├── AGENTS.md            # Arnés general y reglas permanentes para agentes de IA
├── CHECKPOINT.md        # Memoria viva del proyecto, bitácora y siguientes pasos
├── README.md            # Portada general del repositorio
├── .gitignore           # Exclusiones de Git (Node.js + Python)
│
├── frontend/            # Cliente Web (React + Vite) — Despliegue en Vercel
├── backend/             # Servidor API (FastAPI + PostgreSQL) — Despliegue en Railway
└── docs/                # Documentación compartida y contratos de API
    └── API_CONTRACT.md  # Especificación de endpoints y modelos de datos
```

---

## 🚀 Características Principales
- **Cifrado en el navegador:** Algoritmo AES-GCM (256 bits) usando la Web Crypto API nativa.
- **Clave maestra efímera:** Solo reside en la memoria volátil de la aplicación; nunca se almacena ni se envía al servidor.
- **Direct-to-Storage:** Archivos cifrados subidos directamente a Google Drive.
- **Backend FastAPI + PostgreSQL:** Gestión de tokens OAuth y persistencia de carpetas y archivos virtuales cifrados.
- **Memoria para Agentes de IA:** Bitácora en [CHECKPOINT.md](CHECKPOINT.md) para garantizar continuidad y coordinación entre asistentes de desarrollo.

---

## 🛠️ Tecnologías
- **Frontend:** React + Vite, Vanilla CSS moderno (modo oscuro / UI mágica).
- **Backend:** Python, FastAPI, PostgreSQL, Docker.
- **Seguridad:** Web Crypto API (AES-GCM, PBKDF2), Google Drive API, Google OAuth 2.0.
- **Hosting:** Vercel (Frontend) & Railway (Backend).
