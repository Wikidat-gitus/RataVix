# 📜 Contrato de API — Baúl Mágico 2
> **Documento de sincronización entre Frontend y Backend.**
> Ambos equipos (y sus agentes de IA) deben respetar los esquemas y acuerdos aquí descritos.

---

## 🔒 Regla de Oro y Modos de Operación (Modo Libre vs. Modo Secreto)
1. **Arquitectura Dual:**
   * **Modo Libre (`es_cifrado = false`):** Gestión ágil de archivos cotidianos sin contraseña maestra. Nombres en texto plano, archivos regulares en Google Drive y cero fricción de acceso.
   * **Modo Secreto (`es_cifrado = true`):** Arquitectura Zero-Knowledge estricta. Cifrado AES-GCM (256 bits) en RAM del cliente con clave maestra, nombres e IVs cifrados, y almacenamiento en Google Drive como blobs `.enc`.
2. En **Modo Secreto**, el backend **nunca** recibe texto plano de nombres de baúles o tesoros ni la contraseña maestra.
3. El backend almacena punteros a Google Drive (`drive_file_id`), pero nunca el contenido ni la clave para descifrarlo.
4. El backend gestiona el refresco de tokens OAuth para Google Drive.
5. El backend almacena el `salt_cifrado` y el `canary_cifrado` (con su IV) para la verificación de clave en el cliente, pero nunca la clave en sí.

---

## 🛰️ Especificación de Endpoints

### 1. Autenticación, Seguridad y Estado del Baúl
* **`POST /api/auth/google`**
  * **Frontend envía:** `{ "code": "string", "email": "string", "google_id": "string" }`
  * **Backend responde:**
    ```json
    {
      "access_token": "string",
      "token_type": "bearer",
      "usuario": {
        "id": "uuid",
        "email": "string",
        "tiene_clave_maestra": true,
        "salt_cifrado": "base64_string o null",
        "canary_cifrado": "base64_string o null",
        "canary_iv": "base64_string o null"
      }
    }
    ```
* **`POST /api/auth/setup-master-key`**
  * **Objetivo:** Registro inicial de la contraseña maestra en Zero-Knowledge (guardando salt y canario de prueba).
  * **Frontend envía:**
    ```json
    {
      "salt_cifrado": "base64_string",
      "canary_cifrado": "base64_string",
      "canary_iv": "base64_string"
    }
    ```
  * **Backend responde:**
    ```json
    {
      "ok": true,
      "mensaje": "Clave maestra configurada con éxito",
      "usuario": {
        "id": "uuid",
        "email": "string",
        "tiene_clave_maestra": true,
        "salt_cifrado": "base64_string",
        "canary_cifrado": "base64_string",
        "canary_iv": "base64_string"
      }
    }
    ```
* **`POST /api/auth/reset-vault`**
  * **Objetivo:** Purgar todos los baúles y tesoros del usuario en Neon y resetear su clave maestra (en caso de olvido), devolviendo los IDs de Google Drive a purgar en la nube.
  * **Frontend envía:** `{ "confirmacion": "BORRAR_TODO" }`
  * **Backend responde:**
    ```json
    {
      "ok": true,
      "mensaje": "Baúl purgado y reseteado exitosamente",
      "deleted_drive_file_ids": ["string (IDs de Google Drive para purga en cliente)"]
    }
    ```
* **`GET /api/auth/session-check`**
  * **Objetivo:** Validar que no haya otra sesión activa simultánea para este usuario.
  * **Backend responde:** `{ "activa": true, "session_id": "uuid" }`

---

### 2. Baúles (Carpetas Virtuales)
* **`GET /api/baules`**
  * **Query params:** 
    * `?es_cifrado=true|false` (opcional; por defecto `true` para Modo Secreto, `false` para Modo Libre).
    * `?baul_padre_id={uuid}` (opcional, para subcarpetas; omitir para baúles raíz).
    * `?todos=true` (opcional, para listar todo el árbol del usuario en el modo correspondiente).
  * **Backend responde:**
    ```json
    [
      {
        "id": "uuid",
        "nombre_cifrado": "base64_string (o texto plano si es_cifrado es false)",
        "iv": "base64_string o null",
        "es_cifrado": true,
        "baul_padre_id": null,
        "creado_en": "ISO8601"
      }
    ]
    ```
* **`POST /api/baules`**
  * **Frontend envía:**
    ```json
    {
      "nombre_cifrado": "base64_string (o texto plano si es_cifrado es false)",
      "iv": "base64_string o null",
      "es_cifrado": true,
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
      "iv": "base64_string o null",
      "baul_padre_id": "uuid o null"
    }
    ```
  * **Backend responde:** Objeto baúl actualizado.
* **`DELETE /api/baules/{id}`**
  * **Objetivo:** Elimina la carpeta virtual y sus contenidos dependientes en cascada.
  * **Backend responde:**
    ```json
    {
      "ok": true,
      "mensaje": "Baúl eliminado con éxito",
      "deleted_drive_file_ids": ["string (IDs de Google Drive para purga en cliente)"]
    }
    ```

---

### 3. Tesoros (Metadatos de Archivos en Google Drive)
* **`GET /api/tesoros`**
  * **Query params:** 
    * `?es_cifrado=true|false` (opcional; por defecto `true` para Modo Secreto, `false` para Modo Libre).
    * `?baul_id={uuid}` (opcional).
  * **Backend responde:**
    ```json
    [
      {
        "id": "uuid",
        "baul_id": "uuid",
        "drive_file_id": "string",
        "nombre_cifrado": "base64_string (o texto plano si es_cifrado es false)",
        "iv": "base64_string o null",
        "es_cifrado": true,
        "tamano_bytes": 1048576,
        "tipo_mime": "application/octet-stream",
        "creado_en": "ISO8601"
      }
    ]
    ```
* **`POST /api/tesoros`**
  * **Nota:** En **Modo Secreto**, el archivo binario cifrado (.enc) se sube a Google Drive (`Baúl Mágico - Datos Cifrados`). En **Modo Libre**, el archivo original se sube a Google Drive (`Baúl Mágico - Mis Archivos`). Una vez confirmado en Drive, se registra en el backend.
  * **Frontend envía:**
    ```json
    {
      "baul_id": "uuid o null",
      "drive_file_id": "string",
      "nombre_cifrado": "base64_string (o texto plano si es_cifrado es false)",
      "iv": "base64_string o null",
      "es_cifrado": true,
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
