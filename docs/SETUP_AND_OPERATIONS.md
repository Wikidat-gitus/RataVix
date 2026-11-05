# 🛠️ Guía de Puesta en Marcha y Operaciones — RataVix

> **Manual de Despliegue, Variables de Entorno y Mantenimiento Cloud ($0/mes)**  
> *Instrucciones paso a paso para recrear y operar el entorno completo de RataVix tanto en local como en producción.*

---

## 📋 1. Requisitos Previos

Para ejecutar o desplegar RataVix necesitas:

* **Desarrollo Local:**
  * **Node.js:** v18.0.0 o superior (recomendado v20 LTS).
  * **Python:** v3.10 o superior (con `pip` y `venv`).
  * **Git:** Para control de versiones.
* **Infraestructura Cloud Gratuita ($0/mes):**
  * **Google Cloud Platform (GCP):** Para Google OAuth 2.0 y Google Drive API v3.
  * **Neon:** Para base de datos PostgreSQL Serverless.
  * **Render:** Para hosting del backend FastAPI (Web Service gratuito).
  * **Vercel:** Para hosting del frontend React + Vite (Hospedaje estático global).

---

## 💻 2. Puesta en Marcha en Entorno Local (Desarrollo)

### 2.1 Clonar el Repositorio
```bash
git clone https://github.com/Wikidat-gitus/RataVix.git
cd RataVix
```

### 2.2 Configuración del Backend (FastAPI)
1. Navegar a la carpeta del backend y crear el entorno virtual:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activar el entorno virtual:
   * **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```
3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configurar el archivo `.env`:
   Copia el archivo `.env.example` como `.env`:
   ```bash
   cp .env.example .env
   ```
   *Nota: Por defecto, en local utilizará SQLite (`sqlite:///./baul_magico.db`), por lo que no requieres instalar PostgreSQL para probar la app localmente.*
5. Iniciar el servidor FastAPI:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Verifica en tu navegador: [http://localhost:8000/health](http://localhost:8000/health)*

### 2.3 Configuración del Frontend (React + Vite)
1. En una nueva terminal, navega a la carpeta de frontend:
   ```bash
   cd frontend
   ```
2. Instalar dependencias de Node.js:
   ```bash
   npm install
   ```
3. Configurar el archivo `.env`:
   Copia `.env.example` como `.env`:
   ```bash
   cp .env.example .env
   ```
   Configura tu Client ID de Google:
   ```env
   VITE_GOOGLE_CLIENT_ID=tu_cliente_id.apps.googleusercontent.com
   # En local no necesitas VITE_API_URL porque vite.config.js usa un proxy inverso a http://localhost:8000
   ```
4. Iniciar el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
   *Abre tu navegador en: [http://localhost:5173](http://localhost:5173)*

---

## ☁️ 3. Configuración de Servicios en la Nube ($0/mes)

### 3.1 Google Cloud Console (OAuth 2.0 y Drive API)

1. **Crear Proyecto:** En [Google Cloud Console](https://console.cloud.google.com/), crea un nuevo proyecto llamado `RataVix`.
2. **Habilitar APIs:**
   * Ve a **APIs y servicios** > **Biblioteca**.
   * Busca y habilita **Google Drive API**.
3. **Pantalla de Consentimiento OAuth (OAuth Consent Screen):**
   * **Tipo de usuario:** Externo.
   * **Nombre de la app:** RataVix.
   * **Correo de soporte:** Tu correo de Google.
   * **Páginas de políticas (Producción):**
     * *Página principal:* `https://ratavix.vercel.app`
     * *Enlace de Privacidad:* `https://ratavix.vercel.app/privacy.html`
     * *Enlace de Términos:* `https://ratavix.vercel.app/terms.html`
   * **Alcances (Scopes):** Agrega únicamente:
     * `.../auth/drive.file` *(Acceso restringido solo a archivos creados por esta aplicación; nunca accede a todo el Drive del usuario).*
     * `userinfo.email` y `userinfo.profile`.
   * **Estado de Publicación:** Pasar a **En Producción** (para evitar la advertencia de *"Google no verificó esta app"*).
4. **Credenciales de ID de Cliente OAuth:**
   * Tipo: **Aplicación web**.
   * **Orígenes autorizados de JavaScript:**
     * `http://localhost:5173`
     * `https://ratavix.vercel.app`
     * `https://baul-magico-2.vercel.app`
   * Guarda el **Client ID** generado.

---

### 3.2 Neon (Base de Datos PostgreSQL Serverless)

1. Regístrate en [Neon](https://neon.tech/) (Plan Free Tier).
2. Crea un proyecto (ej: `ratavix-db`) en la región `AWS US-East (N. Virginia)` para mínima latencia con Render.
3. Copia la cadena de conexión completa (URI con SSL):
   ```text
   postgresql://usuario:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

---

### 3.3 Render (Hosting Backend FastAPI)

1. En [Render Dashboard](https://dashboard.render.com/), crea un **New Web Service**.
2. Conecta tu repositorio de GitHub (`RataVix`).
3. Configuración del servicio:
   * **Name:** `ratavix-api`
   * **Region:** `US East (Ohio / Virginia)`
   * **Root Directory:** `backend`
   * **Runtime:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   * **Instance Type:** `Free`
4. **Variables de Entorno en Render:**
   | Variable | Valor de Ejemplo | Descripción |
   | :--- | :--- | :--- |
   | `ENVIRONMENT` | `production` | Activa modo de producción |
   | `DATABASE_URL` | `postgresql://...@...neon.tech/neondb?sslmode=require` | Cadena de conexión de Neon |
   | `ALLOWED_ORIGINS` | `https://ratavix.vercel.app,https://baul-magico-2.vercel.app` | Orígenes CORS autorizados |
   | `SECRET_KEY` | *(Cadena aleatoria de 64 caracteres)* | Llave para tokens JWT de sesión |
   | `ALGORITHM` | `HS256` | Algoritmo de firma |
   | `GOOGLE_CLIENT_ID` | `tu_id.apps.googleusercontent.com` | Client ID de Google |

---

### 3.4 Vercel (Hosting Frontend React + Vite)

1. En [Vercel](https://vercel.com/), haz clic en **Add New Project** e importa el repositorio de GitHub.
2. Configuración del proyecto:
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend`
3. **Variables de Entorno en Vercel:**
   | Variable | Valor | Descripción |
   | :--- | :--- | :--- |
   | `VITE_GOOGLE_CLIENT_ID` | `tu_id.apps.googleusercontent.com` | Google Identity Services |
   | `VITE_API_URL` | `https://tu-api.onrender.com/api` | URL del backend en Render |
4. Haz clic en **Deploy**. Vercel configurará automáticamente el enrutamiento SPA mediante el archivo [frontend/vercel.json](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/frontend/vercel.json).

---

## 🧪 4. Pruebas Automatizadas y Diagnóstico

### 4.1 Suite de Tests de Backend
Para ejecutar las pruebas automatizadas de persistencia, CRUD, eliminación en cascada y seguridad de sesión única:
```bash
cd backend
pytest tests/test_api.py -v
```

### 4.2 Consola de Diagnóstico Local (Modo Admin)
En entorno local (`localhost:5173`), dispones de herramientas avanzadas de diagnóstico:
* **Acceso:** Pulsa `Ctrl + Shift + D`, agrega `?dev=true` en la URL o haz clic en `🛠️ Modo Admin` en el footer.
* **Capacidades:**
  * **Test de Estrés de Concurrencia:** Emite ráfagas de 5 a 30 peticiones concurrentes para medir latencia y rendimiento de Neon y Render.
  * **Benchmark Web Crypto:** Mide la velocidad de cifrado/descifrado en tu CPU (MB/s con aceleración hardware AES-NI).
  * **Purga de Caché:** Limpieza de IndexedDB y reset de estados.
* *Nota de Seguridad:* En producción (`vercel.app`), el Modo Admin se encuentra 100% deshabilitado y removido del bundle mediante Code Splitting con `React.lazy()`.

---

## ⚠️ 5. Operaciones y Mantenimiento

### 5.1 Manejo del "Cold-Start" de Render
El plan gratuito de Render suspende el contenedor tras 15 minutos de inactividad:
* La primera petición puede tardar entre **30 y 50 segundos** en responder mientras el contenedor se reactiva.
* RataVix incluye en el frontend un detector automático de salud que muestra un mensaje amigable al usuario indicando: *"El servidor se está despertando, esto tomará unos segundos..."*.

### 5.2 Reseteo de Bóveda por Pérdida de Clave Maestra
Dado que RataVix es **Zero-Knowledge**, si el usuario olvida su contraseña maestra en Modo Secreto:
* **Nadie puede recuperar los archivos cifrados.**
* El usuario puede utilizar el botón **"¿Olvidaste tu clave?"** en el diálogo de desbloqueo.
* La app ofrece una purga segura (`POST /api/auth/reset-vault`), que elimina los metadatos en Neon y purga simultáneamente los archivos `.enc` huérfanos en Google Drive, permitiéndole configurar una nueva contraseña maestra desde cero.

