import React, { createContext, useContext, useState, useCallback } from 'react';
import { deriveKeyFromPassword, generateSalt } from '../crypto/pbkdf2.js';
import { encryptText, decryptText, encryptBinary, decryptBinary } from '../crypto/aesGcm.js';

const CryptoContext = createContext(null);

// Salt por defecto para desarrollo/mock (en producción vendrá del perfil del usuario en PostgreSQL)
const MOCK_SALT = 'YmF1bC1tYWdpY28tc2FsdC0yMDI2'; // Base64 de 16 bytes

export function CryptoProvider({ children }) {
  // REGLA ZERO-KNOWLEDGE: La clave vive ÚNICAMENTE en este estado volátil de React (RAM).
  // Nunca en localStorage, sessionStorage ni cookies.
  const [cryptoKey, setCryptoKey] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState(null);

  const isUnlocked = Boolean(cryptoKey);

  /**
   * Desbloquea el baúl derivando la CryptoKey en memoria a partir de la contraseña maestra
   */
  const unlockVault = useCallback(async (masterPassword) => {
    if (!masterPassword || masterPassword.trim() === '') {
      setError('Por favor ingresa una clave maestra válida.');
      return false;
    }

    setUnlocking(true);
    setError(null);

    // Validación de clave maestra (en desarrollo/Fase 3 se exige 'rasputin')
    if (masterPassword.trim() !== 'rasputin') {
      setError('Contraseña maestra incorrecta. Por favor verifica tu clave.');
      setUnlocking(false);
      return false;
    }

    try {
      // PBKDF2: 100,000 iteraciones con SHA-256
      const key = await deriveKeyFromPassword(masterPassword.trim(), MOCK_SALT);
      setCryptoKey(key);
      setUnlocking(false);
      return true;
    } catch (err) {
      console.error('Error al derivar la clave criptográfica:', err);
      setError('Error al procesar la clave maestra.');
      setUnlocking(false);
      return false;
    }
  }, []);

  /**
   * Cierra el baúl y destruye inmediatamente la clave de la memoria RAM
   */
  const lockVault = useCallback(() => {
    setCryptoKey(null);
    setError(null);
  }, []);

  /**
   * Cifra un nombre (carpeta o archivo) devolviendo los campos del contrato de API
   */
  const encryptName = useCallback(async (plainName) => {
    if (!cryptoKey) throw new Error('El baúl está bloqueado. Clave no disponible.');
    const { cipherText, iv } = await encryptText(plainName, cryptoKey);
    return { nombre_cifrado: cipherText, iv };
  }, [cryptoKey]);

  /**
   * Descifra un nombre cifrado en Base64
   */
  const decryptName = useCallback(async (nombre_cifrado, iv) => {
    if (!cryptoKey) return '🔒 [Bloqueado]';
    try {
      return await decryptText(nombre_cifrado, iv, cryptoKey);
    } catch (err) {
      console.warn('Fallo al descifrar elemento (¿clave incorrecta?):', err);
      return '⚠️ [Error de descifrado]';
    }
  }, [cryptoKey]);

  /**
   * Cifra un archivo binario
   */
  const encryptFileBlob = useCallback(async (fileData) => {
    if (!cryptoKey) throw new Error('El baúl está bloqueado. Clave no disponible.');
    return await encryptBinary(fileData, cryptoKey);
  }, [cryptoKey]);

  /**
   * Descifra un archivo binario
   */
  const decryptFileBlob = useCallback(async (encryptedBuffer, iv) => {
    if (!cryptoKey) throw new Error('El baúl está bloqueado. Clave no disponible.');
    return await decryptBinary(encryptedBuffer, iv, cryptoKey);
  }, [cryptoKey]);

  const value = {
    isUnlocked,
    cryptoKey,
    unlocking,
    error,
    unlockVault,
    lockVault,
    encryptName,
    decryptName,
    encryptFileBlob,
    decryptFileBlob
  };

  return (
    <CryptoContext.Provider value={value}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (!context) {
    throw new Error('useCrypto debe ser usado dentro de un CryptoProvider');
  }
  return context;
}
