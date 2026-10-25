# 🧭 Memoria y Checkpoints del Proyecto — Baúl Mágico 2

> **Instrucción para los Agentes de IA:**
> 1. **Lectura obligatoria:** Al iniciar cualquier sesión o tarea, lee este archivo para conocer el estado actual y las decisiones técnicas vigentes.
> 2. **Actualización obligatoria:** Al culminar un paso, validar un cambio o tomar un acuerdo de arquitectura, actualiza este archivo registrando el avance en la bitácora y marcando los siguientes pasos.

---

## 📍 Estado General del Proyecto
* **Fase Actual:** `Fase 1: Cimientos y Entornos de Trabajo (Frontend React + Vite & Mocking)`
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

---

## 🗺️ Plan Maestro de 6 Fases (Roadmap Oficial)

* [x] **Fase 0: Definición y Reglas de Juego**
  * Visión Zero-Knowledge, arnés general, roles de agentes y contrato inicial de API.
* [ ] **Fase 1: Cimientos y Entornos de Trabajo (EN CURSO)**
  * [x] **1.1 (Frontend):** Inicializar aplicación base React + Vite en `frontend/` con sistema de estilos Vanilla CSS modo oscuro.
  * [x] **1.2 (Frontend):** Crear capa de simulación (*mock service*) basada en `docs/API_CONTRACT.md` para trabajar sin depender del backend.
  * [ ] **1.3 (Frontend):** Instalar dependencias (`npm install`) y validar servidor local (`npm run dev`).
  * [ ] **1.4 (Backend):** Inicializar estructura base de FastAPI y entorno virtual en `backend/`.
  * [ ] **1.5:** Commit de cimientos de la Fase 1.
* [ ] **Fase 2: Desarrollo Paralelo con Contrato de API**
  * Frontend: Criptografía en cliente (`src/crypto/` con AES-GCM + PBKDF2), UI de baúles y tesoros, subida directa a Google Drive API.
  * Backend: FastAPI, Google OAuth 2.0 (refresco seguro de tokens), modelos PostgreSQL (`usuarios`, `baules`, `tesoros`), control de sesión única.
* [ ] **Fase 3: Integración y Auditoría Zero-Knowledge**
  * Conexión Frontend real con Backend real.
  * Auditoría de tráfico de red (F12) garantizando que no viajan contraseñas ni textos planos.
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
