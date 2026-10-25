# 🧭 Memoria y Checkpoints del Proyecto — Baúl Mágico 2

> **Instrucción para los Agentes de IA:**
> 1. **Lectura obligatoria:** Al iniciar cualquier sesión o tarea, lee este archivo para conocer el estado actual y las decisiones técnicas vigentes.
> 2. **Actualización obligatoria:** Al culminar un paso, validar un cambio o tomar un acuerdo de arquitectura, actualiza este archivo registrando el avance en la bitácora y marcando los siguientes pasos.

---

## 📍 Estado General del Proyecto
* **Fase Actual:** `Fase 1: Preparación del Monorepo y Estructura Base`
* **Arquitectura:** Monorepo (`frontend/` + `backend/` + `docs/`)
* **Repositorio:** `luislopez343/Baul-Magico-2` (GitHub Privado, rama principal: `main`)

---

## 📋 Bitácora de Checkpoints (Historial de Avances)

| Checkpoint | Fecha | Responsable | Descripción y Logro |
| :--- | :--- | :--- | :--- |
| **CP-01** | 2026-10-24 | Usuario + Agente | Inicialización del repositorio Git local y GitHub remoto (`luislopez343/Baul-Magico-2`). Configuración de [.gitignore](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/.gitignore) y [AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/AGENTS.md). |
| **CP-02** | 2026-10-24 | Usuario + Agente | Transición acordada a arquitectura **Monorepo**. Configuración de memoria persistente ([CHECKPOINT.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/CHECKPOINT.md)) y contrato de API ([docs/API_CONTRACT.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/docs/API_CONTRACT.md)). |
| **CP-03** | 2026-10-24 | Usuario + Agente | Implementación de la **Trinidad de Agentes**: Agente Coordinador General ([AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/AGENTS.md)), Agente Frontend ([frontend/AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/frontend/AGENTS.md)) y Agente Backend ([backend/AGENTS.md](file:///c:/Users/Wikiliks!/Sandbox2/Proyectos/Baul_Magico_2/backend/AGENTS.md)). Creación de invocaciones directas por `@` en `.agents/rules/` (`@master_agent`, `@front_agent`, `@back_agent`). |

---

## 🎯 Tarea Activa (En Curso)
- [ ] **Paso 1.1:** Inicializar la aplicación base de Frontend (`frontend/`) con React + Vite.
- [ ] **Paso 1.2:** Dejar la estructura base y guía inicial en `backend/` para el equipo de FastAPI.
- [ ] **Paso 1.3:** Validar ejecución local de Vite (`npm run dev`) y realizar commit.

---

## 🗺️ Roadmap de Siguientes Pasos

### 🎨 Frontend
1. [ ] Crear `frontend/` con React + Vite.
2. [ ] Configurar el sistema de diseño Vanilla CSS moderno (modo oscuro / estética mágica).
3. [ ] Implementar el módulo criptográfico cliente (`src/crypto/`): derivación de clave con PBKDF2 y cifrado AES-GCM 256 bits.
4. [ ] Integrar flujo de autenticación con Google OAuth.
5. [ ] Conectar subida directa de archivos cifrados a Google Drive API.

### ⚙️ Backend (Para el desarrollador de FastAPI)
1. [ ] Configurar entorno FastAPI (`backend/app/main.py`) y Dockerfile / docker-compose.
2. [ ] Conexión a PostgreSQL (modelos: `usuarios`, `baules`, `tesoros`).
3. [ ] Endpoint para intercambio y refresco seguro de tokens OAuth de Google.
4. [ ] Endpoints de gestión de metadatos virtuales cifrados (CRUD baúles y tesoros).
5. [ ] Mecanismo de validación de sesión única por usuario.

---

## 🤝 Acuerdos Técnicos Clave (Frontend ⟷ Backend)
* **Puertos locales:**
  * Frontend (Vite): `http://localhost:5173`
  * Backend (FastAPI): `http://localhost:8000`
* **CORS:** El backend debe permitir origen `http://localhost:5173` en desarrollo.
* **Cero Conocimiento:** El backend **NUNCA** recibe contraseñas maestras, ni nombres de archivos o carpetas en texto plano. Todo llega con campos `_cifrado` y su respectivo IV (vector de inicialización).
