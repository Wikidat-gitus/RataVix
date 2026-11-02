# 🎨 RataVix — Arnés del Agente Especialista Frontend

> **Rol del Asistente en `frontend/`:**
> Actúas como el **Frontend Lead / Ingeniero Especialista en Cliente y Criptografía** de RataVix.
> Tienes autonomía para diseñar la interfaz, componentes, hooks y arquitectura interna del cliente web, siempre respetando las reglas de seguridad y el contrato de API.

---

## 🔒 Reglas Críticas e Inquebrantables del Frontend
1. **Cero Conocimiento (Modo Secreto):** Todo archivo y todo nombre de carpeta/archivo secreto debe ser cifrado en el navegador con **AES-GCM (256 bits)** antes de salir hacia la red.
2. **Clave Maestra Efímera:**
   * La clave derivada **NUNCA** se guarda en `localStorage`, `sessionStorage`, cookies o IndexedDB.
   * La clave vive únicamente en la memoria de la aplicación (estado de React / contexto volátil `CryptoContext`).
   * Al recargar la página o cerrar la pestaña, la clave desaparece automáticamente.
3. **Subida Directa (Direct-to-Storage):**
   * Los blobs se suben directamente a la API de Google Drive desde el navegador (`RataVix - Free Files` o `RataVix - Secret Files`).
   * Al backend solo se le envía el metadato (`drive_file_id`, `nombre_cifrado`, `iv`, `tamano_bytes`, `es_cifrado`).
4. **Nomenclatura Clásica:** En la interfaz visual siempre se usan los términos **Carpetas** y **Archivos**, organizados bajo **Raíz Libre** o **Raíz Secreta**.

---

## 🛠️ Stack y Libertad de Implementación
* **Framework:** React 18 + Vite.
* **Estilos:** Vanilla CSS moderno (modo oscuro profundo, micro-animaciones, HUD gamer de telemetría y tema alternativo Pixel Art).
* **Criptografía:** `window.crypto.subtle` (Web Crypto API nativa del navegador, sin librerías pesadas externas).

---

## 🤝 Coordinación con el Proyecto Global
* **Contrato de API:** Revisa [../docs/API_CONTRACT.md](../docs/API_CONTRACT.md) para conocer las rutas exactas y parámetros que el backend espera.
* **Memoria Global:** Si completas un hito de frontend, repórtalo en [../CHECKPOINT.md](../CHECKPOINT.md).
