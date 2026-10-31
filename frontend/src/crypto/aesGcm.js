/**
 * Módulo Criptográfico AES-GCM (256 bits)
 * Cifrado y descifrado autenticado de textos y binarios en cliente
 */

import { bufferToBase64, base64ToBuffer, generateRandomBytes } from './utils.js';

const IV_LENGTH_BYTES = 12; // 96 bits recomendado para AES-GCM

/**
 * Cifra una cadena de texto (como nombres de baúles o tesoros)
 * 
 * @param {string} plainText - Texto en claro a cifrar
 * @param {CryptoKey} key - Clave derivada AES-GCM (256 bits)
 * @returns {Promise<{ cipherText: string, iv: string }>} Objeto con texto cifrado e IV en Base64
 */
export async function encryptText(plainText, key) {
  if (typeof plainText !== 'string') {
    throw new Error('El valor a cifrar debe ser una cadena de texto.');
  }

  // 1. Generar vector de inicialización único de 96 bits
  const iv = generateRandomBytes(IV_LENGTH_BYTES);

  // 2. Codificar texto a UTF-8
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plainText);

  // 3. Cifrar con AES-GCM
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedData
  );

  return {
    cipherText: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv)
  };
}

/**
 * Descifra una cadena de texto previamente cifrada con AES-GCM
 * 
 * @param {string} cipherTextBase64 - Texto cifrado en Base64
 * @param {string} ivBase64 - Vector de inicialización en Base64
 * @param {CryptoKey} key - Clave derivada AES-GCM (256 bits)
 * @returns {Promise<string>} Texto descifrado en claro
 */
export async function decryptText(cipherTextBase64, ivBase64, key) {
  const cipherBytes = base64ToBuffer(cipherTextBase64);
  const ivBytes = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    key,
    cipherBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Cifra un archivo binario (ArrayBuffer o Blob)
 * 
 * @param {ArrayBuffer | Blob} fileData - Datos binarios del archivo
 * @param {CryptoKey} key - Clave derivada AES-GCM (256 bits)
 * @returns {Promise<{ encryptedBuffer: ArrayBuffer, iv: string }>} Buffer cifrado e IV en Base64
 */
export async function encryptBinary(fileData, key) {
  let arrayBuffer;
  if (fileData instanceof Blob) {
    arrayBuffer = await fileData.arrayBuffer();
  } else if (fileData instanceof ArrayBuffer) {
    arrayBuffer = fileData;
  } else if (ArrayBuffer.isView(fileData)) {
    arrayBuffer = fileData.buffer;
  } else {
    throw new Error('Formato de datos no soportado. Debe ser ArrayBuffer o Blob.');
  }

  const iv = generateRandomBytes(IV_LENGTH_BYTES);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    arrayBuffer
  );

  return {
    encryptedBuffer,
    iv: bufferToBase64(iv)
  };
}

/**
 * Descifra un archivo binario previamente cifrado con AES-GCM
 * 
 * @param {ArrayBuffer} encryptedBuffer - Buffer de bytes cifrados
 * @param {string} ivBase64 - Vector de inicialización en Base64
 * @param {CryptoKey} key - Clave derivada AES-GCM (256 bits)
 * @returns {Promise<ArrayBuffer>} Buffer descifrado en claro
 */
export async function decryptBinary(encryptedBuffer, ivBase64, key) {
  const ivBytes = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    key,
    encryptedBuffer
  );

  return decryptedBuffer;
}
