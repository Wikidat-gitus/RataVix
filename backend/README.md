# ⚙️ Baúl Mágico 2 — Backend API

Servidor API construido con **FastAPI** y **PostgreSQL** para la gestión de usuarios, metadatos virtuales cifrados y flujo de autenticación Google OAuth.

---

## 📌 Responsabilidades del Backend
1. **Google OAuth 2.0:** Intercambio de códigos de autorización y refresco seguro de tokens para Google Drive.
2. **Sistema de Archivos Virtual:** Persistencia en PostgreSQL de:
   * `baules` (carpetas virtuales cifradas).
   * `tesoros` (metadatos de archivos cifrados y puntero `drive_file_id`).
3. **Control de Sesión Única:** Validar que solo exista una sesión activa por usuario a la vez.

> [!IMPORTANT]
> **Arquitectura Zero-Knowledge:**
> Este servidor **NUNCA** debe recibir ni almacenar contraseñas maestras, ni nombres de archivos/carpetas en texto plano. Todo el cifrado y descifrado ocurre en el navegador del cliente.

---

## 📖 Documentación Relevante
* **Contrato de Endpoints:** Consulta [docs/API_CONTRACT.md](../docs/API_CONTRACT.md) para ver la especificación exacta de payloads esperados por el frontend.
* **Arnés del Proyecto:** Consulta [AGENTS.md](../AGENTS.md) para conocer las directrices generales de seguridad.
* **Memoria y Checkpoints:** Consulta [CHECKPOINT.md](../CHECKPOINT.md) para registrar avances técnicos.

---

## 🚀 Inicio Rápido para Desarrollo Local (FastAPI + Docker)
1. Crear entorno virtual: `python -m venv venv`
2. Activar entorno:
   * Windows: `venv\Scripts\activate`
   * Linux/Mac: `source venv/bin/activate`
3. Instalar dependencias: `pip install -r requirements.txt`
4. Iniciar servidor: `uvicorn app.main:app --reload --port 8000`
