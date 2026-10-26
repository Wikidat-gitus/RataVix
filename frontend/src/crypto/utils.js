/**
 * Utilidades de conversión y generación criptográfica
 * Web Crypto API nativa
 */

/**
 * Convierte un ArrayBuffer o Uint8Array a cadena Base64
 * @param {ArrayBuffer | Uint8Array} buffer
 * @returns {string} Cadena en Base64
 */
export function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convierte una cadena Base64 a Uint8Array
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function base64ToBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Genera bytes criptográficamente seguros
 * @param {number} length Cantidad de bytes
 * @returns {Uint8Array}
 */
export function generateRandomBytes(length) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return array;
}
