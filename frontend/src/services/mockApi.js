/**
 * Simulación de API (Mock Service) para Baúl Mágico 2
 * Cumple 100% con las rutas y esquemas definidos en docs/API_CONTRACT.md
 * Permite al Frontend avanzar en paralelo sin depender de que el Backend esté listo.
 */

// Datos simulados en memoria
let mockBaules = [
  {
    id: 'b1a2-3c4d-baul-root',
    nombre_cifrado: 'RE9DVU1FTlRPUyBNw4FHSUNPUw==', // Base64 simulado
    iv: 'aXYtYWVzLWdjbS0xMnd4',
    baul_padre_id: null,
    creado_en: new Date().toISOString()
  }
];

let mockTesoros = [
  {
    id: 't1a2-3c4d-tesoro-01',
    baul_id: 'b1a2-3c4d-baul-root',
    drive_file_id: '1aB2cD3eFgHiJkLmNoPqRsTuVwXyZ',
    nombre_cifrado: 'Y3VlbnRhc19jbGF2ZS5rZGJ4',
    iv: 'aXYtYWVzLWdjbS0xMnd4',
    tamano_bytes: 1468006,
    tipo_mime: 'application/octet-stream',
    creado_en: new Date().toISOString()
  }
];

export const mockApi = {
  // 1. Sesión y Autenticación
  async checkSession() {
    return { activa: true, session_id: 'mock-session-uuid-1234' };
  },

  // 2. Baúles (Carpetas)
  async getBaules(baulPadreId = null) {
    return mockBaules.filter(b => b.baul_padre_id === baulPadreId);
  },

  async createBaul({ nombre_cifrado, iv, baul_padre_id = null }) {
    const nuevoBaul = {
      id: `baul-${Date.now()}`,
      nombre_cifrado,
      iv,
      baul_padre_id,
      creado_en: new Date().toISOString()
    };
    mockBaules.push(nuevoBaul);
    return nuevoBaul;
  },

  // 3. Tesoros (Archivos)
  async getTesoros(baulId) {
    return mockTesoros.filter(t => t.baul_id === baulId);
  },

  async createTesoro({ baul_id, drive_file_id, nombre_cifrado, iv, tamano_bytes, tipo_mime }) {
    const nuevoTesoro = {
      id: `tesoro-${Date.now()}`,
      baul_id,
      drive_file_id,
      nombre_cifrado,
      iv,
      tamano_bytes,
      tipo_mime: tipo_mime || 'application/octet-stream',
      creado_en: new Date().toISOString()
    };
    mockTesoros.push(nuevoTesoro);
    return nuevoTesoro;
  }
};
