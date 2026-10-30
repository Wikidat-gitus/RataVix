/**
 * Cliente de API Real para Baúl Mágico 2
 * Conecta el Frontend con el Backend FastAPI en http://localhost:8000/api
 * Arquitectura Zero-Knowledge: Solo viajan metadatos cifrados e IVs.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Almacén seguro del token de sesión en memoria de sesión (se destruye al cerrar la pestaña)
const TOKEN_STORAGE_KEY = 'baul_session_token';

// --- Almacenamiento Persistente en IndexedDB para simular Google Drive ---
// Permite que los archivos binarios cifrados persistan tras recargar la página (F5)
const DB_NAME = 'baul_magico_drive_db';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted_files';
const driveMockMemStorage = new Map();

function openDriveDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB no soportado en este entorno.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'drive_file_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const api = {
  // --- Gestión de Token de Sesión Única ---
  getToken() {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
  },

  setToken(token) {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },

  clearToken() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  // --- Helper Centralizado de Peticiones HTTP ---
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    // Detección de Control de Sesión Única (Token revocado o sesión abierta en otro dispositivo)
    if (response.status === 401) {
      this.clearToken();
      window.dispatchEvent(
        new CustomEvent('baul:session-revoked', {
          detail: { mensaje: 'Tu sesión fue cerrada o abierta en otro dispositivo.' },
        })
      );
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Sesión no autorizada o expirada.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error en servidor (HTTP ${response.status})`);
    }

    // Si es HTTP 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  },

  // --- 1. Autenticación y Sesión ---
  async loginGoogle(payload = 'mock_google_auth_code') {
    const body = typeof payload === 'object' ? payload : { code: payload };
    const data = await this.request('/auth/google', {
      method: 'POST',
      body,
    });
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  },

  async setupMasterKey({ salt_cifrado, canary_cifrado, canary_iv }) {
    return this.request('/auth/setup-master-key', {
      method: 'POST',
      body: { salt_cifrado, canary_cifrado, canary_iv },
    });
  },

  async resetVault() {
    return this.request('/auth/reset-vault', {
      method: 'POST',
      body: { confirmacion: 'BORRAR_TODO' },
    });
  },

  async checkSession() {
    return this.request('/auth/session-check', {
      method: 'GET',
    });
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  },

  // --- 2. Baúles (Carpetas Virtuales) ---
  async getBaules(baulPadreId = null) {
    const query = baulPadreId ? `?baul_padre_id=${encodeURIComponent(baulPadreId)}` : '';
    return this.request(`/baules${query}`, { method: 'GET' });
  },

  async getAllBaules() {
    return this.request('/baules?todos=true', { method: 'GET' });
  },

  async getBaulById(id) {
    const todos = await this.getAllBaules();
    return todos.find((b) => b.id === id) || null;
  },

  async createBaul({ nombre_cifrado, iv, baul_padre_id = null }) {
    return this.request('/baules', {
      method: 'POST',
      body: {
        nombre_cifrado,
        iv,
        baul_padre_id: baul_padre_id || null,
      },
    });
  },

  async updateBaul(id, updates) {
    return this.request(`/baules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates,
    });
  },

  async deleteBaul(id) {
    return this.request(`/baules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // --- 3. Tesoros (Metadatos de Archivos Virtuales) ---
  async getTesoros(baulId = null) {
    const query = baulId ? `?baul_id=${encodeURIComponent(baulId)}` : '';
    return this.request(`/tesoros${query}`, {
      method: 'GET',
    });
  },

  async createTesoro({ baul_id, drive_file_id, nombre_cifrado, iv, tamano_bytes, tipo_mime }) {
    return this.request('/tesoros', {
      method: 'POST',
      body: {
        baul_id: baul_id || null,
        drive_file_id,
        nombre_cifrado,
        iv,
        tamano_bytes,
        tipo_mime: tipo_mime || 'application/octet-stream',
      },
    });
  },

  async updateTesoro(id, updates) {
    return this.request(`/tesoros/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates,
    });
  },

  async deleteTesoro(id) {
    return this.request(`/tesoros/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // --- 4. Custodia Persistente de Blobs Cifrados (Simulación duradera de Google Drive) ---
  async uploadDriveMock(encryptedArrayBuffer, fileIv = null) {
    const drive_file_id = `gdrive-mock-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
    try {
      const db = await openDriveDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({
          drive_file_id,
          encryptedBuffer: encryptedArrayBuffer,
          fileIv: fileIv || null,
          guardado_en: Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Fallback a almacenamiento en memoria volátil:', e);
      driveMockMemStorage.set(drive_file_id, { encryptedBuffer: encryptedArrayBuffer, fileIv });
    }
    return { drive_file_id };
  },

  async downloadDriveMock(drive_file_id) {
    try {
      const db = await openDriveDB();
      const record = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(drive_file_id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (record) {
        return record; // Devuelve { drive_file_id, encryptedBuffer, fileIv }
      }
    } catch (e) {
      console.warn('Error al leer de IndexedDB:', e);
    }

    const memData = driveMockMemStorage.get(drive_file_id);
    if (!memData) {
      throw new Error('Archivo binario no encontrado en el almacenamiento de Drive.');
    }
    if (memData instanceof ArrayBuffer) {
      return { encryptedBuffer: memData, fileIv: null };
    }
    return memData;
  },
};
