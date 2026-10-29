/**
 * Simulación de API (Mock Service) para Baúl Mágico 2
 * Cumple 100% con las rutas y esquemas definidos en docs/API_CONTRACT.md
 * Soporta CRUD completo (Crear, Leer, Actualizar/Mover/Renombrar, Eliminar)
 * y almacenamiento de blobs cifrados simulando Google Drive.
 */

// Base de datos en memoria para el mock
let mockBaules = [];
let mockTesoros = [];
const mockDriveStorage = new Map(); // drive_file_id -> ArrayBuffer cifrado

export const mockApi = {
  // 1. Sesión y Autenticación
  async checkSession() {
    return { activa: true, session_id: 'mock-session-uuid-1234', email: 'usuario@baulmagico.local' };
  },

  // 2. Baúles (Carpetas)
  async getBaules(baulPadreId = null) {
    return mockBaules.filter(b => b.baul_padre_id === (baulPadreId || null));
  },

  async getAllBaules() {
    return [...mockBaules];
  },

  async getBaulById(id) {
    return mockBaules.find(b => b.id === id) || null;
  },

  async createBaul({ nombre_cifrado, iv, baul_padre_id = null }) {
    const nuevoBaul = {
      id: `baul-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nombre_cifrado,
      iv,
      baul_padre_id: baul_padre_id || null,
      creado_en: new Date().toISOString()
    };
    mockBaules.push(nuevoBaul);
    return nuevoBaul;
  },

  async updateBaul(id, updates) {
    const index = mockBaules.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Baúl no encontrado');

    mockBaules[index] = {
      ...mockBaules[index],
      ...(updates.nombre_cifrado && { nombre_cifrado: updates.nombre_cifrado }),
      ...(updates.iv && { iv: updates.iv }),
      ...(updates.baul_padre_id !== undefined && { baul_padre_id: updates.baul_padre_id }),
      actualizado_en: new Date().toISOString()
    };
    return mockBaules[index];
  },

  async deleteBaul(id) {
    // Elimina el baúl y en cascada sus subbaúles y tesoros
    const idsAEliminar = [id];
    let encontrados = [id];

    while (encontrados.length > 0) {
      const padreId = encontrados.pop();
      const hijos = mockBaules.filter(b => b.baul_padre_id === padreId);
      for (const h of hijos) {
        idsAEliminar.push(h.id);
        encontrados.push(h.id);
      }
    }

    const deletedTesoros = mockTesoros.filter(t => idsAEliminar.includes(t.baul_id));
    const deleted_drive_file_ids = deletedTesoros.map(t => t.drive_file_id).filter(Boolean);

    mockBaules = mockBaules.filter(b => !idsAEliminar.includes(b.id));
    mockTesoros = mockTesoros.filter(t => !idsAEliminar.includes(t.baul_id));
    return { ok: true, mensaje: 'Baúl y contenidos eliminados', deleted_drive_file_ids };
  },

  // 3. Tesoros (Archivos)
  async getTesoros(baulId) {
    return mockTesoros.filter(t => t.baul_id === (baulId || null));
  },

  async createTesoro({ baul_id, drive_file_id, nombre_cifrado, iv, tamano_bytes, tipo_mime }) {
    const nuevoTesoro = {
      id: `tesoro-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      baul_id: baul_id || null,
      drive_file_id,
      nombre_cifrado,
      iv,
      tamano_bytes,
      tipo_mime: tipo_mime || 'application/octet-stream',
      creado_en: new Date().toISOString()
    };
    mockTesoros.push(nuevoTesoro);
    return nuevoTesoro;
  },

  async updateTesoro(id, updates) {
    const index = mockTesoros.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tesoro no encontrado');

    mockTesoros[index] = {
      ...mockTesoros[index],
      ...(updates.nombre_cifrado && { nombre_cifrado: updates.nombre_cifrado }),
      ...(updates.iv && { iv: updates.iv }),
      ...(updates.baul_id !== undefined && { baul_id: updates.baul_id }),
      actualizado_en: new Date().toISOString()
    };
    return mockTesoros[index];
  },

  async deleteTesoro(id) {
    const index = mockTesoros.findIndex(t => t.id === id);
    if (index !== -1) {
      const tesoro = mockTesoros[index];
      if (tesoro.drive_file_id) {
        mockDriveStorage.delete(tesoro.drive_file_id);
      }
      mockTesoros.splice(index, 1);
    }
    return { ok: true, mensaje: 'Tesoro eliminado' };
  },

  // 4. Simulación de Google Drive (Subida y Descarga directa de blobs cifrados)
  async uploadDriveMock(encryptedArrayBuffer) {
    const drive_file_id = `gdrive-mock-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
    mockDriveStorage.set(drive_file_id, encryptedArrayBuffer);
    return { drive_file_id };
  },

  async downloadDriveMock(drive_file_id) {
    const data = mockDriveStorage.get(drive_file_id);
    if (!data) throw new Error('Archivo no encontrado en Google Drive simulado');
    return data;
  }
};
