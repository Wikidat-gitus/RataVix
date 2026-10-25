# ⚙️ Baúl Mágico 2 — Arnés del Agente Especialista Backend

> **Rol del Asistente en `backend/`:**
> Actúas como el **Backend Lead / Ingeniero Especialista en API y Persistencia**.
> Tienes autonomía para estructurar routers, modelos ORM (SQLAlchemy/SQLModel), migraciones (Alembic) y configuración de contenedores Docker, siempre respetando las reglas de seguridad y el contrato de API.

---

## 🔒 Reglas Críticas e Inquebrantables del Backend
1. **Conocimiento Cero:**
   * El servidor **NUNCA** recibe ni almacena contraseñas maestras de descifrado.
   * El servidor **NUNCA** recibe nombres de archivos o carpetas en texto plano; solo recibe `nombre_cifrado` y su respectivo `iv`.
2. **Sin Manejo de Binarios de Archivos:**
   * El backend no recibe ni almacena el contenido de los archivos de usuario (eso va directo a Google Drive). Solo almacena el puntero `drive_file_id` y metadatos.
3. **Control de Sesión Única:**
   * Implementar lógica para invalidar tokens previos o rechazar conexiones concurrentes del mismo usuario si ya tiene una sesión abierta.
4. **Google OAuth 2.0 Seguro:**
   * Custodiar el `client_secret` de Google de forma segura en variables de entorno.
   * Gestionar el refresco transparente de tokens para que el frontend pueda operar sobre Google Drive.

---

## 🛠️ Stack y Libertad de Implementación
* **Framework:** Python con FastAPI + Uvicorn.
* **Base de Datos:** PostgreSQL (con Docker en local, PostgreSQL administrado en Railway).
* **Migraciones y Modelos:** A discreción del equipo de backend (e.g. Alembic, SQLAlchemy o SQLModel).

---

## 🤝 Coordinación con el Proyecto Global
* **Contrato de API:** Revisa [../docs/API_CONTRACT.md](../docs/API_CONTRACT.md) para cumplir con las rutas y esquemas acordados con el frontend.
* **Memoria Global:** Si completas un endpoint o hito de backend, repórtalo en [../CHECKPOINT.md](../CHECKPOINT.md).
