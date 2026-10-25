# 🎨 Baúl Mágico 2 — Frontend

Cliente web desarrollado con **React + Vite** y **Vanilla CSS moderno** con arquitectura de **Conocimiento Cero (Zero-Knowledge)**.

---

## 📌 Responsabilidades del Frontend
1. **Criptografía en Cliente:** Uso de la Web Crypto API nativa (AES-GCM 256 bits y PBKDF2) para cifrar antes de subir y descifrar tras descargar.
2. **Subida Directa (Direct-to-Storage):** Subida de blobs binarios cifrados directamente a Google Drive API sin pasar los archivos por el servidor backend.
3. **Interfaz de Usuario (UI/UX):** Estética mágica, moderna, modo oscuro y feedback visual dinámico.
4. **Control de Pestaña Única:** Uso de `BroadcastChannel` para prevenir sesiones duplicadas.

---

## 📖 Documentación Relevante
* **Contrato de API:** [docs/API_CONTRACT.md](../docs/API_CONTRACT.md)
* **Arnés y Reglas del Proyecto:** [AGENTS.md](../AGENTS.md)
* **Memoria y Checkpoints:** [CHECKPOINT.md](../CHECKPOINT.md)
