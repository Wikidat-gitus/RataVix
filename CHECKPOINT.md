# 🧭 Memoria y Checkpoints del Proyecto — Baúl Mágico 2

> **Instrucción para los Agentes de IA:**
> 1. **Lectura obligatoria:** Al iniciar cualquier sesión o tarea, lee este archivo para conocer el estado actual y las decisiones técnicas vigentes.
> 2. **Actualización obligatoria:** Al culminar un paso, validar un cambio o tomar un acuerdo de arquitectura, actualiza este archivo registrando el avance en la bitácora y marcando los siguientes pasos.

---

## 📍 Estado General del Proyecto
* **Fase Actual:** `Fase 4.5: Refinamiento, Pruebas de Estrés y Optimización UX en la Nube` ➔ Previa a `Fase 5 (Consolidación / Docs)` y futura extensión móvil `Android App`.
* **Arquitectura:** Monorepo (`frontend/` + `backend/` + `docs/`)
* **Repositorio:** `Wikidat-gitus/Baul-Magico-2` (GitHub Privado, rama principal: `main`)
* **URLs de Producción ($0/mes):**
  * **Frontend (Vercel):** `https://baul-magico-2.vercel.app`
  * **Backend (Render):** `https://baul-magico-2-api-9e9p.onrender.com`
  * **Base de Datos (Neon):** PostgreSQL Serverless (AWS US-East Virginia)

---

## 📋 Bitácora de Checkpoints (Historial de Avances)

| Checkpoint | Fecha | Responsable | Descripción y Logro |
| :--- | :--- | :--- | :--- |
| **CP-01** | 2026-10-24 | Usuario + Agente | Inicialización del repositorio Git local y GitHub remoto (`Wikidat-gitus/Baul-Magico-2`). Configuración de [.gitignore](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/.gitignore) y [AGENTS.md](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/AGENTS.md). |
| **CP-02** | 2026-10-24 | Usuario + Agente | Transición acordada a arquitectura **Monorepo**. Configuración de memoria persistente ([CHECKPOINT.md](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/CHECKPOINT.md)) y contrato de API ([docs/API_CONTRACT.md](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/docs/API_CONTRACT.md)). |
| **CP-03** | 2026-10-24 | Usuario + Agente | Implementación de la **Trinidad de Agentes**: Agente Coordinador General ([AGENTS.md](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/AGENTS.md)), Agente Frontend ([frontend/AGENTS.md](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/frontend/AGENTS.md)) y Agente Backend ([backend/AGENTS.md](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/backend/AGENTS.md)). Creación de invocaciones directas por `@` en `.agents/rules/` (`@master_agent`, `@front_agent`, `@back_agent`). |
| **CP-04** | 2026-10-24 | Usuario + Agente | Formalización del **Plan Maestro de 6 Fases (SDLC)**. Estrategia de desarrollo en paralelo mediante Mocks del contrato de API y cero esperas bloqueantes entre equipos. |
| **CP-05** | 2026-10-24 | Usuario + Agente | **Gobernanza y Separación Estricta de Roles:** `@master_agent` queda delimitado exclusivamente a planificación, coordinación y documentación raíz; la implementación técnica pasa a ser titularidad exclusiva de `@front_agent` (`frontend/`) y `@back_agent` (`backend/`). |
| **CP-06** | 2026-10-25 | Usuario + @back_agent | **Cimientos de Backend (Hito 1.4):** Estructura modular de FastAPI en `backend/` (`core/`, `api/v1/`, `schemas/`), entorno virtual `venv` con dependencias instaladas, middleware de CORS para `http://localhost:5173` y validación de endpoints (`/health` y `/api/baules`). |
| **CP-07** | 2026-10-25 | Usuario + @front_agent | **Cimientos de Frontend (Hito 1.3):** Instalación exitosa de dependencias con `npm install` (React 18 + Vite) y validación de arranque del servidor de desarrollo en `http://localhost:5173/`. |
| **CP-08** | 2026-10-25 | Usuario + @master_agent | **Cierre Oficial de la Fase 1:** Entornos de Frontend y Backend 100% operativos, probados localmente y versionados en Git. Paso habilitado a la Fase 2. |
| **CP-09** | 2026-10-26 | Usuario + @front_agent | **Criptografía Cliente Validada (Hito 2.1):** Módulo nativo Web Crypto API completado y verificado en vivo por el usuario (`utils.js`, `pbkdf2.js`, `aesGcm.js`). Derivación PBKDF2 (100,000 iteraciones SHA-256), cifrado/descifrado AES-GCM (256 bits) para metadatos (texto a Base64 + IV 96 bits) y archivos binarios reales en memoria RAM. Testbench interactivo validado exitosamente en navegador con restauración intacta. |
| **CP-10** | 2026-10-26 | Usuario + @front_agent + @master_agent | **Clave Efímera en RAM y Explorador de Baúl Virtual (Hito 2.2):** Creación de `CryptoContext` para retención segura de clave en memoria RAM (Zero-Knowledge, destruida al recargar o bloquear). Implementación de `UnlockVaultModal` con soporte para contraseña maestra (ej: `"rasputin"`) y derivación instantánea. Implementación de `VaultExplorer` con navegación fluida por subcarpetas, migas de pan (breadcrumbs), ciclo de vida completo (crear, renombrar, mover y eliminar baúles y tesoros) y subida/descarga de archivos con cifrado/descifrado AES-GCM real en cliente. Actualización del contrato de API ([docs/API_CONTRACT.md](file:///c:/Users/Wikid/SandBox/Proyectos/Baul-Magico-2/docs/API_CONTRACT.md)) con endpoints `PUT` y `DELETE`. |
| **CP-11** | 2026-10-26 | Usuario + @front_agent | **Experiencia de Usuario Avanzada (Visor en Vivo, Toasts y Detección de Tipos):** Implementación de `TreasureViewerModal` para descifrar y visualizar archivos directamente en el navegador (imágenes con Lightbox, PDFs en iframe integrado, texto/código con visor monoespaciado y copia rápida, audio y video nativo). Detección automática inteligente de categorías de archivo (`fileTypes.js`) con insignias y colores dedicados. Reemplazo de `window.confirm` por `ConfirmModal` con estética oscura y creación de sistema de notificaciones flotantes Toast sin disrupción visual. |
| **CP-12** | 2026-10-26 | Usuario + @front_agent | **Organización Interactiva por Drag & Drop (Hito 2.2+):** Implementación de la API nativa de arrastrar y soltar (Drag and Drop con el mouse) para mover baúles y tesoros de manera intuitiva. Soporte para soltar elementos tanto sobre cualquier carpeta virtual en el grid como sobre cualquier nivel de la barra de migas de pan (breadcrumbs) para regresar a la raíz o a niveles superiores. Efectos visuales de arrastre (`is-dragging`), iluminación de destino (`drop-hover`) y validación para evitar auto-anidación de carpetas. |
| **CP-13** | 2026-10-27 | Usuario + @master_agent | **Consolidación de Frontend en `main` y Apertura de Hito 2.3 (Backend):** Fusión exitosa de la rama `frontend` en `main` y despliegue a repositorio remoto GitHub. Sincronización de la rama `backend` con el contrato de API actualizado (endpoints `PUT` y `DELETE` para baúles y tesoros). Inicio formal del desarrollo de persistencia PostgreSQL y sesión única en el backend. |
| **CP-14** | 2026-10-27 | Usuario + @back_agent | **Persistencia ORM, Sesión Única y CRUD de Backend (Hito 2.3):** Implementación de capa de persistencia con SQLAlchemy 2.0 (`SessionLocal`, inyección `get_db`). Modelos de datos `Usuario`, `Baul` (auto-referencial en cascada) y `Tesoro` (`drive_file_id`). Sistema de Control de Sesión Única vía `active_session_token` en `security.py` y `auth.py` (invalidación automática de sesiones concurrentes). Endpoints CRUD reales (`GET`, `POST`, `PUT`, `DELETE`) para baúles y tesoros según contrato de API. Suite integral de verificación (`backend/test_backend.py`) aprobada exitosamente. |
| **CP-15** | 2026-10-27 | Usuario + @master_agent | **Cierre Oficial de Fase 2 y Consolidación Total en `main`:** Fusión de la rama `backend` en `main` y sincronización con GitHub (`origin/main`). Frontend (UI, criptografía cliente, Drag & Drop) y Backend (persistencia ORM, control de sesión única, endpoints CRUD) unificados en la rama principal. Habilitado el inicio de la Fase 3: Integración y Auditoría Zero-Knowledge. |
| **CP-16** | 2026-10-27 | Usuario + @master_agent + @front_agent | **Integración Real Frontend ⟷ Backend (Fase 3):** Creación del cliente HTTP `api.js` en React y enrutamiento mediante proxy en `vite.config.js` hacia FastAPI (`:8000`). Conexión de `VaultExplorer.jsx` y `TreasureViewerModal.jsx` a los endpoints reales de persistencia. Incorporación de indicador de salud dinámico en el encabezado (`🟢 API FastAPI Activa`) y escucha del evento de sesión única revocada para autobloqueo de seguridad. Verificación de proxy y comunicación fluida en vivo. |
| **CP-17** | 2026-10-28 | Usuario + @master_agent | **Consolidación en `main` de Persistencia IndexedDB y Subida en Raíz:** Fusión de las ramas `frontend` y sincronización con `backend` hacia `main` y GitHub remoto. Soporte para tesoros sin carpeta padre (`baul_id = null`), persistencia de binarios e IVs en IndexedDB cliente (`baul_magico_drive_db`) tras recarga (F5) y validación de contraseña maestra estricta (`"rasputin"`). Confirmada la inspección visual en base de datos mediante extensión SQLite Viewer. |
| **CP-18** | 2026-10-28 | Usuario + @front_agent + @master_agent | **Auditoría Zero-Knowledge (Hito 3.2) y Conexión Google Drive Real (Hito 3.3):** Auditoría F12 superada empíricamente (cero contraseñas o nombres en claro por la red). Configuración de Client ID OAuth de Google Cloud. Creación del servicio `googleDrive.js` y `GoogleAuthContext.jsx` con Google Identity Services (`drive.file`). Soporte de subida multipart con empaquetado autocontenido de IV (12 bytes), descarga, borrado en nube y carpeta contenedora automática `Baúl Mágico - Datos Cifrados`. |
| **CP-19** | 2026-10-29 | Usuario + @front_agent + @master_agent | **Subida Real a Google Drive Validada y Diagnóstico de Pruebas de Estrés:** Corrección del estándar multipart RFC 2387 en `googleDrive.js`. Subida real de blobs cifrados (.enc) a Google Drive confirmada en vivo en la carpeta `Baúl Mágico - Datos Cifrados`. Identificadas mejoras de blindaje para retomar: bloqueo de acciones/overlay durante subida (evitar condiciones de carrera) y retorno de `deleted_drive_file_ids` en backend para purga automática en Google Drive de baúles eliminados en cascada. |
| **CP-20** | 2026-10-29 | Usuario + @front_agent + @master_agent | **Blindaje UX y Overlay Bloqueante de Subida Protegida (Hito 3.3+):** Creación del componente `UploadProgressModal.jsx` y su sistema visual de 3 etapas en `App.css` (Cifrado RAM con AES-GCM 256 bits ➔ Subida .enc a Google Drive ➔ Sincronización en Baúl). Bloqueo total de interfaz y botones críticos (`Cerrar Baúl`, `Subir Tesoro`, `Nuevo Baúl`) durante la subida para evitar condiciones de carrera o destrucción prematura de la clave en RAM. Compilación exitosa con Vite y push a rama `frontend`. |
| **CP-21** | 2026-10-29 | Usuario + @back_agent + @front_agent + @master_agent | **Eliminación en Cascada y Purga Automática en Google Drive (Cierre de Fase 3):** Actualización de `docs/API_CONTRACT.md` y endpoint `DELETE /api/baules/{id}` en FastAPI con algoritmo BFS para recolectar y devolver todos los `deleted_drive_file_ids` del subárbol jerárquico. Integración en `VaultExplorer.jsx` y `mockApi.js` para purgar concurrentemente los blobs en Google Drive, erradicando archivos huérfanos. Suite de pruebas aprobada y Fase 3 lista para consolidación en `main`. |
| **CP-22** | 2026-10-29 | Usuario + @front_agent + @master_agent | **Flujo Ordenado en 2 Pasos y Botón Unificado "Cerrar Sesión" (Hito 3.4):** Implementación de `GoogleAuthGate.jsx` (Paso 1: Identificación y Google OAuth) antes de `UnlockVaultModal.jsx` (Paso 2: Derivación de Clave Maestra en RAM). Unificación de acciones de salida en un único botón `🚪 Cerrar Sesión` en Header y Explorador. Resiliencia amigable ante F5 (mantiene sesión de Google en la pestaña pero bloquea el baúl en RAM solicitando únicamente la clave maestra). Compilación validada en Vite y push a rama `frontend`. |
| **CP-23** | 2026-10-29 | Usuario + @front_agent + @master_agent | **Refinamiento de UX y Blindaje Operativo (Hito 3.4+):** 1) Overlay bloqueante durante eliminación de baúl/tesoro con spinner y mensaje de purga en Drive hasta que el evento se confirme. 2) Visor de tesoros persistente (solo se cierra al pulsar 'X', ignorando clics accidentales fuera del modal). 3) Botón único 'Cerrar Sesión' exclusivamente en el encabezado superior (removido botón redundante en barra del explorador). Compilación validada en Vite y push a rama `frontend`. |
| **CP-24** | 2026-10-29 | Usuario + @master_agent | **Consolidación Oficial de Fase 3 en `main` y Cierre de Hito:** Fusión limpia y completa de todas las características de la Fase 3 en la rama sagrada `main` y GitHub remoto. Sistema validado end-to-end con Google Drive real (.enc), Web Crypto nativo, flujo de acceso en 2 pasos (Google OAuth ➔ Clave Maestra en RAM), overlays bloqueantes contra condiciones de carrera, eliminación en cascada con purga en nube, y botón único 'Cerrar Sesión'. Paso habilitado a la Fase 4 (Despliegue Cloud). |
| **CP-25** | 2026-10-29 | Usuario + @master_agent + @front_agent + @back_agent | **Despliegue en la Nube 100% Operativo ($0/mes) y Cierre de Fase 4:** 1) Provisión de base de datos PostgreSQL Serverless en Neon (`AWS US East 1`) con tablas `usuarios`, `baules`, `tesoros` creadas y verificadas. 2) Despliegue de Backend FastAPI en Render (`baul-magico-2-api-9e9p.onrender.com`) en Virginia, con arranque Uvicorn y CORS habilitado para Vercel. 3) Despliegue de Frontend React + Vite en Vercel (`baul-magico-2.vercel.app`) con reglas SPA `vercel.json` y health check dinámico. 4) Autorización de orígenes en Google OAuth Cloud Console. 5) Sincronización automática de sesión única entre Google Identity Services y FastAPI (`/api/auth/google`), permitiendo desbloqueo instantáneo con clave maestra en RAM en producción. Paso habilitado a la Fase 5. |
| **CP-26** | 2026-10-30 | Usuario + @master_agent | **Verificación Empírica en Producción y Planificación de Próxima Sesión:** 1) Confirmada la persistencia real en la nube: usuario `wikidat.g@gmail.com` autenticado, baúl virtual creado y tesoro de video (`video/mp4`, 1.4 MB) subido a Google Drive (`144u32w...`) con metadatos y nombre cifrado (`PeaLV...`, `tLVgs...`) custodiados en Neon. 2) Registro de prioridades para la siguiente sesión: **Refinamiento & Pulido de Detalles** (pruebas de estrés de red/subida, optimizaciones UX/UI, tiempos de respuesta) antes de la documentación de Fase 5 y la arquitectura del arnés para la futura **App Android**. |
| **CP-27** | 2026-10-30 | Usuario + @front_agent + @master_agent | **Separación de Experiencia de Usuario vs. Consola Admin/Mantenimiento (Hito 4.5):** 1) **Modo Usuario (por defecto):** Desaparición de pestañas técnicas, badges de API y atajos de desarrollo; flujo directo y limpio al Baúl Virtual con aviso amigable de conexión para cold-starts de Render. 2) **Modo Admin / Dev:** Accesible vía footer discreto (`🛠️ Modo Admin`), parámetro URL (`?dev=true` o `?admin=true`) o atajo de teclado (`Ctrl+Shift+D`); barra superior con métricas de salud y latencia (ping ms), selector de entornos, y componente `AdminMaintenancePanel.jsx` con diagnóstico de conexión a Neon/Render, purga de IndexedDB, acceso al `CryptoPlayground` y especificación arquitectónica. Compilación exitosa en Vite y push a rama `frontend`. |
| **CP-28** | 2026-10-30 | Usuario + @back_agent + @front_agent + @master_agent | **Autonomía Total de Usuario: Creación de Clave Maestra y Purga por Olvido (Hito 4.5+):** 1) **Backend:** Actualización de `Usuario` con `salt_cifrado`, `canary_cifrado` y `canary_iv`. Endpoints `POST /api/auth/setup-master-key` y `POST /api/auth/reset-vault` (purga en base de datos y retorno de IDs de Google Drive). Migración ligera en `init_db.py` para Postgres/SQLite. Suite integral aprobada (`test_backend.py`). 2) **Frontend:** Eliminación del hardcode `"rasputin"`. Nuevo componente `CreateMasterKeyModal.jsx` para usuarios nuevos con validación, confirmación y advertencia crítica Zero-Knowledge. Verificación de autenticidad de clave con mensaje canario AES-GCM en `UnlockVaultModal.jsx`. Nuevo componente `ResetVaultModal.jsx` con confirmación explícita `"ELIMINAR"` para purga simultánea en Google Drive y backend. Consolidado en `main`. |
| **CP-29** | 2026-10-30 | Usuario + @front_agent + @master_agent | **Modernización UX/UI — Menú ⋮ Contextual y Dropzone Global de Archivos (Hito 4.5++):** 1) **Limpieza de Tarjetas:** Eliminación de los 5 botones saturados en tarjetas de archivos y carpetas; incorporación de acciones primarias visibles (`📂 Abrir` / `👁️ Ver` / `⬇️ Descargar`) y menú flotante de 3 puntos (`⋮`) para acciones secundarias (*Renombrar, Mover, Eliminar*), con cierre automático al hacer clic fuera o pulsar `Escape`. 2) **Dropzone Global del Sistema Operativo:** Capacidad de arrastrar cualquier archivo desde el explorador de Windows/Mac hacia la ventana del navegador; activación de overlay visual con resplandor mágico e inicio automático de cifrado RAM AES-GCM (256 bits) y subida a Google Drive. Compilación exitosa en Vite y push a rama `frontend`. |
| **CP-30** | 2026-10-30 | Usuario + @front_agent + @master_agent | **Depuración y Pulido Minimalista del Explorador (Hito 4.5+++):** 1) **Barra Unificada:** Eliminada la barra redundante "Baúl Abierto"; integración de botones `+Nuevo Baúl` y `Subir Tesoro` directamente en la barra de navegación de `🧭 Raíz del Baúl`. 2) **Estado Vacío Pixel Art:** Reemplazado el texto aburrido "Esperando tus tesoros" por una ilustración retro pixel art de un baúl mágico con aura mística. 3) **Tarjetas Minimalistas:** Clic directo en cualquier parte de la tarjeta para abrir o previsualizar; eliminación de botones inferiores y reubicación exclusiva del menú `⋮` en la esquina superior derecha. Compilación y push a `frontend`. |
| **CP-31** | 2026-10-30 | Usuario + @front_agent + @master_agent | **Botón Picture-in-Picture en Visor y Catálogo Enriquecido de Iconos por Formato (Hito 4.5++++):** 1) **Botón Directo PiP:** En `TreasureViewerModal.jsx`, nuevo botón `📺 Miniatura` para videos que activa/desactiva la ventana flotante con un solo clic sincronizado mediante la Web PiP API. 2) **Iconografía según Formato:** Enriquecido `fileTypes.js` con soporte para Word (`📘`), Excel/CSV (`📊`), PowerPoint (`📑`), Código (`💻`), Texto (`📝`), Video (`🎬`), Audio (`🎵`), Imágenes (`🖼️`), PDF (`📄`), Comprimidos (`📦`), Instaladores (`⚙️`) y formato General (`📄`), con insignias y colores dedicados en CSS. Compilación exitosa y push a `frontend`. |

---

## 🗺️ Plan Maestro de 6 Fases (Roadmap Oficial)

* [x] **Fase 0: Definición y Reglas de Juego**
  * Visión Zero-Knowledge, arnés general, roles de agentes y contrato inicial de API.
* [x] **Fase 1: Cimientos y Entornos de Trabajo (COMPLETADA)**
  * [x] **1.1 (Frontend):** Inicializar aplicación base React + Vite en `frontend/` con sistema de estilos Vanilla CSS modo oscuro.
  * [x] **1.2 (Frontend):** Crear capa de simulación (*mock service*) basada en `docs/API_CONTRACT.md` para trabajar sin depender del backend.
  * [x] **1.3 (Frontend):** Instalar dependencias (`npm install`) y validar servidor local (`npm run dev`).
  * [x] **1.4 (Backend):** Inicializar estructura base de FastAPI y entorno virtual en `backend/`.
  * [x] **1.5:** Commit de cimientos de la Fase 1.
* [x] **Fase 2: Desarrollo Paralelo con Contrato de API (COMPLETADA)**
  * [x] **2.1 (Frontend):** Criptografía en cliente (`src/crypto/` con AES-GCM 256 bits + derivación PBKDF2 de 100,000 iteraciones + utilidades Base64 + Laboratorio interactivo).
  * [x] **2.2 (Frontend):** Almacén seguro de clave efímera (`CryptoContext`), modal de clave maestra y UI completa de Baúles/Tesoros con navegación y CRUD completo.
  * [x] **2.3 (Backend):** FastAPI, Google OAuth y Sesión Única, modelos de persistencia (`usuarios`, `baules`, `tesoros`) y endpoints CRUD reales conectados a base de datos.
* [x] **Fase 3: Integración y Auditoría Zero-Knowledge (COMPLETADA Y CONSOLIDADA EN MAIN)**
  * [x] **3.1:** Conexión de Frontend real con Backend real mediante `api.js` y proxy de Vite (probado con HTTP 200).
  * [x] **3.2:** Auditoría de tráfico de red en vivo (F12) garantizando que no viajan contraseñas ni textos planos al crear y listar baúles/tesoros.
  * [x] **3.3:** Validación del flujo de Google Drive real (subida y almacenamiento de blobs .enc validado en vivo).
  * [x] **3.4:** Blindaje de subida (anti race-conditions) y purga en cascada en Google Drive.
* [x] **Fase 4: Despliegue en la Nube (Free Tier / Bajo Costo) (COMPLETADA Y EN PRODUCCIÓN)**
  * [x] **4.1:** Provisión de base de datos PostgreSQL en Neon (Serverless permanente con SSL en Virginia).
  * [x] **4.2:** Despliegue de Backend FastAPI en Render (Uvicorn + CORS para Vercel en Virginia).
  * [x] **4.3:** Despliegue de Frontend React + Vite en Vercel (`vercel.json` SPA + `VITE_API_URL`).
  * [x] **4.4:** Autorización de orígenes en Google Cloud Console para Google OAuth & Drive.
  * [x] **4.5:** Sincronización de token de sesión única en producción y validación end-to-end.
* [ ] **Fase 4.5: Refinamiento, Pruebas de Estrés y Optimización UX (EN CURSO)**
  * [x] **Separación de Experiencias:** Modo Usuario limpio (sin ruidos técnicos) vs Consola de Mantenimiento / Modo Admin (Ctrl+Shift+D).
  * [x] **Feedback de Espera (Cold-Start):** Banner amigable de espera activa para el despertar de Render.
  * [x] **Limpieza Visual de Tarjetas:** Menú contextual `⋮` para acciones secundarias y acciones primarias destacadas.
  * [x] **Dropzone Global del SO:** Arrastre directo de archivos desde Windows/Mac al navegador con cifrado automático.
  * [ ] Pruebas de estrés con archivos de distintos pesos y formatos en la nube.
  * [ ] Vista alternativa (Cuadrícula ⊞ vs Lista ☰) y filtro rápido de búsqueda.
* [ ] **Fase 5: Consolidación, Mantenimiento y Aprendizaje Profundo**
  * Documentación paso a paso ("Cómo recrear Baúl Mágico 2 desde cero sin agentes").
  * Manual de mantenimiento, variables de entorno y soporte.
* [ ] **Fase 6: Expansión Móvil — Arnés de Agente y Arquitectura Android**
  * Definición del agente especialista en Android / Flutter.
  * Reutilización de los pilares de API Contract y Web Crypto nativo adaptado a móvil.

---

## 🤝 Acuerdos Técnicos Clave (Frontend ⟷ Backend)
* **Puertos locales:**
  * Frontend (Vite): `http://localhost:5173`
  * Backend (FastAPI): `http://localhost:8000`
* **Entornos de Producción Cloud ($0/mes):**
  * Frontend: `https://baul-magico-2.vercel.app`
  * Backend: `https://baul-magico-2-api-9e9p.onrender.com`
  * Database: Neon PostgreSQL (`neondb` en AWS US-East-1)
* **CORS:** El backend en Render permite `http://localhost:5173` y `https://baul-magico-2.vercel.app`.
* **Cero Conocimiento:** El backend **NUNCA** recibe contraseñas maestras, ni nombres de archivos o carpetas en texto plano. Todo llega con campos `_cifrado` y su respectivo IV (vector de inicialización).

---

## 🌿 Política de Ramas de Git (Workflow de Integración)
1. **`main` (Sagrada):** Solo almacena código terminado, validado y libre de errores. Nadie hace commits directos en `main`.
2. **`frontend`:** Rama de trabajo activa para el desarrollo del cliente web y criptografía (`@front_agent`).
3. **`backend`:** Rama de trabajo activa para el servidor FastAPI y base de datos (`@back_agent`).
4. **Fusión (Merge / Pull Request):** Al culminar y probar una subfase o hito, se fusiona la rama de área hacia `main` previa validación del `@master_agent`.
