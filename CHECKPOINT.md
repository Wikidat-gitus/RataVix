# 🧭 Memoria y Checkpoints del Proyecto — Baúl Mágico 2

> **Instrucción para los Agentes de IA:**
> 1. **Lectura obligatoria:** Al iniciar cualquier sesión o tarea, lee este archivo para conocer el estado actual y las decisiones técnicas vigentes.
> 2. **Actualización obligatoria:** Al culminar un paso, validar un cambio o tomar un acuerdo de arquitectura, actualiza este archivo registrando el avance en la bitácora y marcando los siguientes pasos.

---

## 📍 Estado General del Proyecto
* **Fase Actual:** `Fase 3: Integración y Auditoría Zero-Knowledge (Frontend ⟷ Backend)`
* **Arquitectura:** Monorepo (`frontend/` + `backend/` + `docs/`)
* **Repositorio:** `luislopez343/Baul-Magico-2` (GitHub Privado, rama principal: `main`)

---

## 📋 Bitácora de Checkpoints (Historial de Avances)

| Checkpoint | Fecha | Responsable | Descripción y Logro |
| :--- | :--- | :--- | :--- |
| **CP-01** | 2026-10-24 | Usuario + Agente | Inicialización del repositorio Git local y GitHub remoto (`luislopez343/Baul-Magico-2`). Configuración de [.gitignore](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/.gitignore) y [AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/AGENTS.md). |
| **CP-02** | 2026-10-24 | Usuario + Agente | Transición acordada a arquitectura **Monorepo**. Configuración de memoria persistente ([CHECKPOINT.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/CHECKPOINT.md)) y contrato de API ([docs/API_CONTRACT.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/docs/API_CONTRACT.md)). |
| **CP-03** | 2026-10-24 | Usuario + Agente | Implementación de la **Trinidad de Agentes**: Agente Coordinador General ([AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/AGENTS.md)), Agente Frontend ([frontend/AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/frontend/AGENTS.md)) y Agente Backend ([backend/AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/backend/AGENTS.md)). Creación de invocaciones directas por `@` en `.agents/rules/` (`@master_agent`, `@front_agent`, `@back_agent`). |
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
* [ ] **Fase 3: Integración y Auditoría Zero-Knowledge**
  * [x] **3.1:** Conexión de Frontend real con Backend real mediante `api.js` y proxy de Vite (probado con HTTP 200).
  * [ ] **3.2:** Auditoría de tráfico de red en vivo (F12) garantizando que no viajan contraseñas ni textos planos al crear y listar baúles/tesoros.
  * [ ] **3.3:** Validación del flujo de Google Drive real (o credenciales OAuth de usuario).
* [ ] **Fase 4: Despliegue en la Nube (Free Tier / Bajo Costo)**
  * Frontend en Vercel.
  * Backend y PostgreSQL en la nube (Render / Koyeb / Neon / Supabase).
* [ ] **Fase 5: Consolidación, Mantenimiento y Aprendizaje Profundo**
  * Documentación paso a paso ("Cómo recrear Baúl Mágico 2 desde cero sin agentes").
  * Manual de mantenimiento y soporte.

---

## 🤝 Acuerdos Técnicos Clave (Frontend ⟷ Backend)
* **Puertos locales:**
  * Frontend (Vite): `http://localhost:5173`
  * Backend (FastAPI): `http://localhost:8000`
* **CORS:** El backend debe permitir origen `http://localhost:5173` en desarrollo.
* **Cero Conocimiento:** El backend **NUNCA** recibe contraseñas maestras, ni nombres de archivos o carpetas en texto plano. Todo llega con campos `_cifrado` y su respectivo IV (vector de inicialización).

---

## 🌿 Política de Ramas de Git (Workflow de Integración)
1. **`main` (Sagrada):** Solo almacena código terminado, validado y libre de errores. Nadie hace commits directos en `main`.
2. **`frontend`:** Rama de trabajo activa para el desarrollo del cliente web y criptografía (`@front_agent`).
3. **`backend`:** Rama de trabajo activa para el servidor FastAPI y base de datos (`@back_agent`).
4. **Fusión (Merge / Pull Request):** Al culminar y probar una subfase o hito, se fusiona la rama de área hacia `main` previa validación del `@master_agent`.
