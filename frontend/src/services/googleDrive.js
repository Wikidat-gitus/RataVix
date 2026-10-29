/**
 * Servicio de Integración Directa con Google Drive API v3 (Zero-Knowledge)
 * 
 * Principios de Seguridad:
 * 1. Todos los archivos binarios se cifran en el navegador ANTES de llegar aquí.
 * 2. Los archivos se suben directamente a la API de Google Drive desde el cliente.
 * 3. En Google Drive solo se almacenan blobs cifrados (.enc) dentro de la carpeta contenedora.
 * 4. Ni el Backend ni Google conocen los nombres reales ni el contenido.
 */

import { base64ToBuffer, bufferToBase64 } from '../crypto/utils.js';

const VAULT_FOLDER_NAME = 'Baúl Mágico - Datos Cifrados';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const IV_LENGTH_BYTES = 12;

let cachedFolderId = null;

/**
 * Obtiene o crea automáticamente la carpeta contenedora en Google Drive
 */
export async function getOrCreateVaultFolder(accessToken) {
  if (cachedFolderId) return cachedFolderId;

  // 1. Buscar si ya existe la carpeta
  const query = encodeURIComponent(`name = '${VAULT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errorData = await searchRes.json().catch(() => ({}));
    throw new Error(`Error al buscar carpeta en Drive: ${errorData.error?.message || searchRes.statusText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    cachedFolderId = data.files[0].id;
    return cachedFolderId;
  }

  // 2. Si no existe, crear la carpeta en la raíz de Google Drive
  const createRes = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: VAULT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Bóveda de archivos cifrados de Baúl Mágico 2 (Arquitectura Zero-Knowledge). Los archivos aquí están encriptados con AES-GCM 256 bits.',
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(`Error al crear carpeta en Drive: ${errorData.error?.message || createRes.statusText}`);
  }

  const createdFolder = await createRes.json();
  cachedFolderId = createdFolder.id;
  return cachedFolderId;
}

/**
 * Sube un archivo binario cifrado (ArrayBuffer) a Google Drive mediante multipart upload
 * Empaqueta los 12 bytes del IV al inicio del payload cifrado (estándar criptográfico autocontenido)
 */
export async function uploadEncryptedFileToDrive({ encryptedBuffer, fileIv, accessToken }) {
  if (!accessToken) {
    throw new Error('Token de Google Drive no disponible. Por favor conecta tu cuenta de Google.');
  }

  const folderId = await getOrCreateVaultFolder(accessToken);
  const blobName = `vault_blob_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.enc`;

  const boundary = `-------BaulMagico${Date.now()}`;
  const metadata = JSON.stringify({
    name: blobName,
    parents: [folderId],
    mimeType: 'application/octet-stream',
    description: 'Blob cifrado con AES-GCM 256 bits (Zero-Knowledge).',
  });

  const ivBytes = fileIv ? base64ToBuffer(fileIv) : new Uint8Array(0);
  const cipherBytes = new Uint8Array(encryptedBuffer);

  const fullPayload = new Uint8Array(ivBytes.byteLength + cipherBytes.byteLength);
  fullPayload.set(ivBytes, 0);
  fullPayload.set(cipherBytes, ivBytes.byteLength);

  const bodyParts = [
    `--${boundary}\r\n`,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadata,
    `\r\n--${boundary}\r\n`,
    'Content-Type: application/octet-stream\r\n\r\n',
    fullPayload,
    `\r\n--${boundary}--`,
  ];

  const multipartBlob = new Blob(bodyParts);

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBlob,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error al subir a Google Drive: ${errorData.error?.message || response.statusText}`);
  }

  const result = await response.json();
  return { drive_file_id: result.id };
}

/**
 * Descarga el ArrayBuffer de un blob cifrado directamente desde Google Drive y extrae su IV
 */
export async function downloadEncryptedFileFromDrive({ driveFileId, accessToken, fallbackIv = null }) {
  if (!accessToken) {
    throw new Error('Token de Google Drive no disponible.');
  }

  const response = await fetch(`${DRIVE_API_URL}/${encodeURIComponent(driveFileId)}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error al descargar de Google Drive: ${errorData.error?.message || response.statusText}`);
  }

  const fullBuffer = await response.arrayBuffer();

  // Si el buffer tiene al menos 12 bytes de cabecera para el IV
  if (fullBuffer.byteLength > IV_LENGTH_BYTES) {
    const ivBytes = new Uint8Array(fullBuffer.slice(0, IV_LENGTH_BYTES));
    const encryptedBytes = fullBuffer.slice(IV_LENGTH_BYTES);
    return {
      encryptedBuffer: encryptedBytes,
      fileIv: bufferToBase64(ivBytes),
    };
  }

  return {
    encryptedBuffer: fullBuffer,
    fileIv: fallbackIv,
  };
}

/**
 * Elimina definitivamente un archivo de Google Drive
 */
export async function deleteFileFromDrive({ driveFileId, accessToken }) {
  if (!accessToken || !driveFileId) return false;

  try {
    const response = await fetch(`${DRIVE_API_URL}/${encodeURIComponent(driveFileId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 204 No Content o 404 (ya no existe) se consideran éxito
    return response.ok || response.status === 404;
  } catch (err) {
    console.warn(`No se pudo eliminar de Google Drive el archivo ${driveFileId}:`, err);
    return false;
  }
}

/**
 * Obtiene la información del perfil del usuario desde Google OAuth2
 */
export async function fetchGoogleUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('No se pudo obtener información del usuario de Google');
  }
  return await response.json();
}
