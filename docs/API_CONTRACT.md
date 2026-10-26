# 📜 Contrato de API — Baúl Mágico 2
> **Documento de sincronización entre Frontend y Backend.**
> Ambos equipos (y sus agentes de IA) deben respetar los esquemas y acuerdos aquí descritos.

---

## 🔒 Regla de Oro: Arquitectura de Conocimiento Cero (Zero-Knowledge)
1. El backend **nunca** recibe texto plano de nombres de baúles o tesoros.
2. El backend **nunca** recibe la contraseña maestra del usuario.
3. El backend almacena punteros a Google Drive (`drive_file_id`), pero nunca el contenido ni la clave para descifrarlo.
4. El backend gestiona el refresco de tokens OAuth para Google Drive.

---

## 🛰️ Especificación de Endpoints

### 1. Autenticación y Sesión
* **`POST /api/auth/google`**
  * **Frontend envía:** `{ "code": "string" }` (Código de autorización OAuth de Google)
  * **Backend responde:** `{ "access_token": "string", "token_type": "bearer", "usuario": { "id": "uuid", "email": "string" } }`
* **`GET /api/auth/session-check`**
  * **Objetivo:** Validar que no haya otra sesión activa simultánea para este usuario.
  * **Backend responde:** `{ "activa": true, "session_id": "uuid" }`

---

### 2. Baúles (Carpetas Virtuales)
* **`GET /api/baules`**
  * **Query params:** `?baul_padre_id={uuid}` (opcional, para listar carpetas raíz o subcarpetas)
  * **Backend responde:**
    ```json
    [
      {
        "id": "uuid",
        "nombre_cifrado": "base64_string",
        "iv": "base64_string",
        "baul_padre_id": null,
        "creado_en": "ISO8601"
      }
    ]
    ```
* **`POST /api/baules`**
  * **Frontend envía:**
    ```json
    {
      "nombre_cifrado": "base64_string",
      "iv": "base64_string",
      "baul_padre_id": "uuid o null"
    }
    ```
  * **Backend responde:** Objeto baúl creado con su nuevo `id`.
* **`PUT /api/baules/{id}`**
  * **Objetivo:** Renombrar baúl o moverlo a otro baúl padre.
  * **Frontend envía (campos opcionales):**
    ```json
    {
      "nombre_cifrado": "base64_string",
      "iv": "base64_string",
      "baul_padre_id": "uuid o null"
    }
    ```
  * **Backend responde:** Objeto baúl actualizado.
* **`DELETE /api/baules/{id}`**
  * **Objetivo:** Elimina la carpeta virtual (y opcionalmente sus elementos contenidos en cascada).
  * **Backend responde:** `{ "ok": true, "mensaje": "Baúl eliminado" }`

---

### 3. Tesoros (Metadatos de Archivos Cifrados en Google Drive)
* **`GET /api/tesoros`**
  * **Query params:** `?baul_id={uuid}`
  * **Backend responde:**
    ```json
    [
      {
        "id": "uuid",
        "baul_id": "uuid",
        "drive_file_id": "string",
        "nombre_cifrado": "base64_string",
        "iv": "base64_string",
        "tamano_bytes": 1048576,
        "tipo_mime": "application/octet-stream",
        "creado_en": "ISO8601"
      }
    ]
    ```
* **`POST /api/tesoros`**
  * **Nota:** El archivo binario cifrado se sube directamente desde el navegador a Google Drive. Una vez que Google Drive confirma la subida y entrega el `drive_file_id`, el frontend registra el tesoro en el backend con este endpoint.
  * **Frontend envía:**
    ```json
    {
      "baul_id": "uuid",
      "drive_file_id": "string",
      "nombre_cifrado": "base64_string",
      "iv": "base64_string",
      "tamano_bytes": 1048576,
      "tipo_mime": "application/octet-stream"
    }
    ```
* **`PUT /api/tesoros/{id}`**
  * **Objetivo:** Renombrar tesoro o moverlo a otro baúl.
  * **Frontend envía (campos opcionales):**
    ```json
    {
      "nombre_cifrado": "base64_string",
      "iv": "base64_string",
      "baul_id": "uuid"
    }
    ```
  * **Backend responde:** Objeto tesoro actualizado.
* **`DELETE /api/tesoros/{id}`**
  * Elimina el registro virtual de la base de datos (y referencia para borrado en Google Drive).
  * **Backend responde:** `{ "ok": true, "mensaje": "Tesoro eliminado" }`
