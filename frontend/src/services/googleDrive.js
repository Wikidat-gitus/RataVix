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

const FREE_FOLDER_NAME = 'Baúl Mágico - Mis Archivos';
let cachedFolderId = null;
let cachedFreeFolderId = null;

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
 * Obtiene o crea automáticamente la carpeta de Modo Libre en Google Drive
 */
export async function getOrCreateFreeFolder(accessToken) {
  if (cachedFreeFolderId) return cachedFreeFolderId;

  const query = encodeURIComponent(`name = '${FREE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errorData = await searchRes.json().catch(() => ({}));
    throw new Error(`Error al buscar carpeta libre en Drive: ${errorData.error?.message || searchRes.statusText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    cachedFreeFolderId = data.files[0].id;
    return cachedFreeFolderId;
  }

  const createRes = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FREE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Carpeta de archivos estándar de Baúl Mágico 2 (Modo Libre).',
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(`Error al crear carpeta libre en Drive: ${errorData.error?.message || createRes.statusText}`);
  }

  const createdFolder = await createRes.json();
  cachedFreeFolderId = createdFolder.id;
  return cachedFreeFolderId;
}

/**
 * Helper interno: Sube un Blob multipart a Google Drive con reporte de progreso en tiempo real
 */
function uploadMultipartWithProgress({ url, accessToken, boundary, bodyBlob, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

    const startTime = performance.now();

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const now = performance.now();
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          const elapsedSec = (now - startTime) / 1000;
          const avgSpeedMBs = elapsedSec > 0 ? (event.loaded / (1024 * 1024)) / elapsedSec : 0;
          const remainingBytes = event.total - event.loaded;
          const etaSec = avgSpeedMBs > 0 ? Math.round(remainingBytes / (avgSpeedMBs * 1024 * 1024)) : null;

          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
            speedMBs: avgSpeedMBs > 0 ? avgSpeedMBs.toFixed(1) : '0.0',
            etaSec,
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (onProgress) {
            onProgress({
              loaded: bodyBlob.size,
              total: bodyBlob.size,
              percent: 100,
              speedMBs: null,
              etaSec: 0,
            });
          }
          resolve({ drive_file_id: res.id });
        } catch {
          reject(new Error('Respuesta inválida de Google Drive'));
        }
      } else {
        let msg = xhr.statusText;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err.error?.message) msg = err.error.message;
        } catch {}
        reject(new Error(`Error al subir a Google Drive: ${msg}`));
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión de red con Google Drive.'));
    xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado al subir a Google Drive.'));

    xhr.send(bodyBlob);
  });
}

/**
 * Sube un archivo binario cifrado (ArrayBuffer) a Google Drive mediante multipart upload
 * Empaqueta los 12 bytes del IV al inicio del payload cifrado (estándar criptográfico autocontenido)
 */
export async function uploadEncryptedFileToDrive({ encryptedBuffer, fileIv, accessToken, onProgress }) {
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

  return uploadMultipartWithProgress({
    url: DRIVE_UPLOAD_URL,
    accessToken,
    boundary,
    bodyBlob: multipartBlob,
    onProgress,
  });
}

/**
 * Sube un archivo binario sin cifrar directamente a Google Drive en la carpeta de Modo Libre
 */
export async function uploadPlainFileToDrive({ file, customName, accessToken, onProgress }) {
  if (!accessToken) {
    throw new Error('Token de Google Drive no disponible. Por favor conecta tu cuenta de Google.');
  }

  const folderId = await getOrCreateFreeFolder(accessToken);
  const boundary = `-------BaulMagicoLibre${Date.now()}`;
  const metadata = JSON.stringify({
    name: customName || file.name,
    parents: [folderId],
    mimeType: file.type || 'application/octet-stream',
    description: 'Archivo estándar de Baúl Mágico 2 (Modo Libre).',
  });

  const fileBuffer = await file.arrayBuffer();
  const bodyParts = [
    `--${boundary}\r\n`,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadata,
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    new Uint8Array(fileBuffer),
    `\r\n--${boundary}--`,
  ];

  const multipartBlob = new Blob(bodyParts);

  return uploadMultipartWithProgress({
    url: DRIVE_UPLOAD_URL,
    accessToken,
    boundary,
    bodyBlob: multipartBlob,
    onProgress,
  });
}

/**
 * Helper interno: Descarga un archivo binario desde Google Drive reportando progreso en tiempo real
 */
function downloadBinaryWithProgress({ url, accessToken, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.responseType = 'arraybuffer';

    const startTime = performance.now();

    if (onProgress) {
      xhr.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const now = performance.now();
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          const elapsedSec = (now - startTime) / 1000;
          const avgSpeedMBs = elapsedSec > 0 ? (event.loaded / (1024 * 1024)) / elapsedSec : 0;
          const remainingBytes = event.total - event.loaded;
          const etaSec = avgSpeedMBs > 0 ? Math.round(remainingBytes / (avgSpeedMBs * 1024 * 1024)) : null;

          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
            speedMBs: avgSpeedMBs > 0 ? avgSpeedMBs.toFixed(1) : '0.0',
            etaSec,
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) {
          onProgress({
            loaded: xhr.response.byteLength,
            total: xhr.response.byteLength,
            percent: 100,
            speedMBs: null,
            etaSec: 0,
          });
        }
        resolve(xhr.response);
      } else {
        reject(new Error(`Error al descargar de Google Drive (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión de red al descargar de Google Drive.'));
    xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado al descargar de Google Drive.'));

    xhr.send();
  });
}

/**
 * Descarga un archivo directamente desde Google Drive sin procesamiento criptográfico (Modo Libre)
 */
export async function downloadPlainFileFromDrive({ driveFileId, accessToken, onProgress }) {
  if (!accessToken) {
    throw new Error('Token de Google Drive no disponible.');
  }

  const url = `${DRIVE_API_URL}/${encodeURIComponent(driveFileId)}?alt=media`;
  return downloadBinaryWithProgress({ url, accessToken, onProgress });
}

/**
 * Descarga el ArrayBuffer de un blob cifrado directamente desde Google Drive y extrae su IV
 */
export async function downloadEncryptedFileFromDrive({ driveFileId, accessToken, fallbackIv = null, onProgress }) {
  if (!accessToken) {
    throw new Error('Token de Google Drive no disponible.');
  }

  const url = `${DRIVE_API_URL}/${encodeURIComponent(driveFileId)}?alt=media`;
  const fullBuffer = await downloadBinaryWithProgress({ url, accessToken, onProgress });

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

/**
 * Consulta la cuota de almacenamiento oficial de Google Drive del usuario
 */
export async function fetchGoogleStorageQuota(accessToken) {
  if (!accessToken) return null;

  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn('No se pudo obtener la cuota de Google Drive:', err);
      return null;
    }

    const data = await response.json();
    const quota = data.storageQuota || {};
    const limit = parseInt(quota.limit, 10) || 0;
    const usage = parseInt(quota.usage, 10) || 0;
    const usageInDrive = parseInt(quota.usageInDrive, 10) || 0;
    const percentage = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0;

    return {
      limit,
      usage,
      usageInDrive,
      percentage,
      isUnlimited: limit === 0,
    };
  } catch (err) {
    console.warn('Excepción al consultar cuota de Google Drive:', err);
    return null;
  }
}
