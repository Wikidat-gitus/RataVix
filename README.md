# 🧙‍♂️ Baúl Mágico 2 — Frontend

Aplicación web de almacenamiento privado con arquitectura de **Conocimiento Cero (Zero-Knowledge)** y cifrado en el cliente (**Client-Side Encryption**).

## 🚀 Características
- **Cifrado en el navegador:** Algoritmo AES-GCM (256 bits) usando la Web Crypto API nativa.
- **Clave maestra efímera:** Solo reside en la memoria volátil de la aplicación; nunca se almacena ni se envía al servidor.
- **Direct-to-Storage:** Archivos cifrados subidos directamente a Google Drive.
- **Backend FastAPI + PostgreSQL:** Repositorio independiente para autenticación OAuth y metadatos de baúles y tesoros.

## 🛠️ Tecnologías
- **Frontend:** React + Vite
- **Estilos:** Vanilla CSS moderno (modo oscuro / UI mágica)
- **Despliegue:** Vercel

## 📦 Estructura del Proyecto
```
Baul_Magico_2/
├── AGENTS.md        # Documentación de contexto y arnés del proyecto
├── .gitignore       # Archivos excluidos del control de versiones
└── README.md        # Información general del repositorio
```
