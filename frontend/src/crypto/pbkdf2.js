/**
 * Módulo de Derivación de Clave Maestra (PBKDF2)
 * Arquitectura Zero-Knowledge: La contraseña nunca se transmite ni almacena.
 */

import { bufferToBase64, base64ToBuffer, generateRandomBytes } from './utils.js';

const PBKDF2_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-256';

/**
 * Genera un salt criptográfico aleatorio de 16 bytes codificado en Base64
 * @returns {string} Salt en Base64
 */
export function generateSalt() {
  const saltBytes = generateRandomBytes(16);
  return bufferToBase64(saltBytes);
}

/**
 * Deriva una CryptoKey simétrica de AES-GCM (256 bits) a partir de una contraseña en texto plano y un salt.
 * 
 * @param {string} password - Contraseña maestra ingresada por el usuario
 * @param {string | Uint8Array} salt - Salt en Base64 o Uint8Array (mínimo 16 bytes recomendados)
 * @param {number} [iterations=100000] - Cantidad de iteraciones PBKDF2
 * @returns {Promise<CryptoKey>} Clave derivada lista para cifrar/descifrar con AES-GCM
 */
export async function deriveKeyFromPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  if (!password || typeof password !== 'string') {
    throw new Error('La contraseña debe ser una cadena no vacía.');
  }

  // 1. Normalizar salt a Uint8Array
  const saltBytes = typeof salt === 'string' ? base64ToBuffer(salt) : salt;

  // 2. Codificar la contraseña en bytes UTF-8
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  // 3. Importar la contraseña como clave base de PBKDF2
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 4. Derivar la clave simétrica AES-GCM de 256 bits
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: iterations,
      hash: HASH_ALGORITHM
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // No exportable: jamás podrá extraerse de la memoria de la Web Crypto API
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}
