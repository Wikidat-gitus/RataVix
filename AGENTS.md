# 🧙‍♂️ Baúl Mágico — Arnés y Contexto del Proyecto

Bienvenido al repositorio de **Baúl Mágico** (Frontend). Este archivo sirve como el arnés de contexto permanente para cualquier agente de IA o desarrollador que trabaje en este espacio de trabajo.

---

## 📌 1. Visión y Objetivo del Proyecto
**Baúl Mágico 2** es una aplicación web de almacenamiento privado con arquitectura de **Conocimiento Cero (Zero-Knowledge)**.
* **Propósito:** Permitir al usuario autenticarse con su cuenta de Google, subir y gestionar archivos que se guardan **100% cifrados** en su propia cuenta de Google Drive.
* **Privacidad Absoluta:** Ni el servidor backend, ni Google, ni terceros pueden leer los archivos ni sus nombres originales. Solo el usuario, mediante su **clave maestra**, puede cifrar y descifrar su información en su propio navegador.

---

## 🔒 2. Pilares de Seguridad y Criptografía
1. **Cifrado en el Cliente (Client-Side Encryption):**
   * Se ejecuta exclusivamente en el navegador mediante la **Web Crypto API** nativa.
   * Algoritmo: **AES-GCM** (256 bits) para archivos y metadatos.
   * Derivación de clave: **PBKDF2** a partir de la contraseña/clave maestra del usuario con *salt* aleatorio.
2. **Clave Maestra Efímera:**
   * La clave maestra vive únicamente en la memoria volátil de la aplicación (estado de React).
   * **NUNCA** se guarda en `localStorage`, `sessionStorage`, cookies, base de datos ni se envía por la red.
   * Al cerrar la pestaña o el navegador, la clave desaparece automáticamente.
3. **Conocimiento Cero en Base de Datos:**
   * Los nombres de carpetas (*baúles*) y archivos (*tesoros*) se cifran en el navegador antes de sincronizarse con la base de datos.
4. **Control de Sesión Única:**
   * Solo puede existir **una pestaña/sesión activa** a la vez.
   * Coordinación en frontend mediante `BroadcastChannel` para detectar y bloquear pestañas duplicadas.

---

## 🏛️ 3. Arquitectura del Sistema
El sistema sigue el patrón **Direct-to-Storage (Subida Directa)**:

```
[ Navegador del Usuario ]
    ├── (1) Autenticación Google OAuth & Metadatos ──> [ Backend FastAPI + PostgreSQL ]
    └── (2) Transferencia de Archivos Cifrados (Blobs) ──> [ Google Drive API ]
```

### Frontend (Este Repositorio)
* **Tecnología:** React + Vite (JavaScript / Vanilla CSS moderno y responsivo).
* **Servidor / Hosting:** Vercel.
* **Responsabilidades:**
  * Interfaz de usuario (UI/UX) limpia, moderna y dinámica (modo oscuro / estética mágica y segura).
  * Manejo del flujo criptográfico (cifrar antes de subir, descifrar tras descargar).
  * Conexión directa con Google Drive API para subida y descarga de archivos cifrados.
  * Comunicación con la API de FastAPI para autenticación, gestión de baúles y tesoros.

### Backend (Desarrollado en equipo en repositorio separado)
* **Tecnología:** Python (FastAPI + Uvicorn) + PostgreSQL (Docker en local, Railway en producción).
* **Responsabilidades:**
  * Gestión de tokens OAuth de Google (refresco seguro de credenciales).
  * Persistencia del sistema de archivos virtual (`usuarios`, `baules`, `tesoros`).
  * Validación de sesión única por usuario.

---

## 🗄️ 4. Modelo de Datos Virtual
* **`usuarios`:** Identificador, ID de Google, email, token de sesión activa.
* **`baules` (Directorios virtuales):**
  * `id`, `usuario_id`, `nombre_cifrado`, `baul_padre_id` (permite jerarquía y subdirectorios).
* **`tesoros` (Archivos virtuales):**
  * `id`, `usuario_id`, `baul_id`, `drive_file_id` (puntero a Google Drive), `nombre_cifrado`, `tamano_bytes`, `tipo_mime`, `vector_inicializacion_iv`.

---

## 👨‍💻 5. Perfil del Usuario y Directrices para el Asistente
* **Nivel del Usuario:** En proceso de aprendizaje de programación.
* **Estilo de Enseñanza y Asistencia:**
  * Explicar el **porqué** de cada decisión técnica antes de escribir código.
  * Ir **paso a paso**, validando cada etapa antes de pasar a la siguiente.
  * Mantener el código limpio, bien comentado y fácil de entender.
  * Fomentar buenas prácticas modernas (Git, control de versiones, variables de entorno con `.env`).
