import React, { createContext, useContext, useState, useCallback } from 'react';
import { deriveKeyFromPassword, generateSalt } from '../crypto/pbkdf2.js';
import { encryptText, decryptText, encryptBinary, decryptBinary } from '../crypto/aesGcm.js';
import { api } from '../services/api';
import { mockApi } from '../services/mockApi';
import { deleteFileFromDrive } from '../services/googleDrive';

const CryptoContext = createContext(null);

// Mensaje Canario para verificar la contraseña en cliente con Zero-Knowledge
const CANARY_MESSAGE = 'BAUL_MAGICO_VERIFICADO_2026';

// Salt por defecto de respaldo (solo para modo de prueba local sin backend)
const DEFAULT_MOCK_SALT = 'YmF1bC1tYWdpY28tc2FsdC0yMDI2';

export function CryptoProvider({ children }) {
  // REGLA ZERO-KNOWLEDGE: La clave vive ÚNICAMENTE en este estado volátil de React (RAM).
  // Nunca en localStorage, sessionStorage ni cookies.
  const [cryptoKey, setCryptoKey] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState(null);

  const isUnlocked = Boolean(cryptoKey);

  /**
   * Configura la clave maestra por primera vez (Usuario Nuevo):
   * 1. Genera un salt criptográfico aleatorio único (16 bytes en Base64).
   * 2. Deriva la clave AES-GCM (256 bits) mediante PBKDF2 (100,000 iteraciones SHA-256).
   * 3. Cifra el mensaje canario con AES-GCM (generando texto cifrado e IV).
   * 4. Envía el salt y el canario al backend para que queden registrados.
   * 5. Retiene la clave en memoria RAM del navegador.
   */
  const setupInitialKey = useCallback(async (masterPassword, isLocalMock = false) => {
    if (!masterPassword || masterPassword.trim().length < 6) {
      setError('La clave maestra debe tener al menos 6 caracteres.');
      return null;
    }

    setUnlocking(true);
    setError(null);

    try {
      const salt = generateSalt();
      const key = await deriveKeyFromPassword(masterPassword.trim(), salt);
      const { cipherText: canary_cifrado, iv: canary_iv } = await encryptText(CANARY_MESSAGE, key);

      const client = isLocalMock ? mockApi : api;
      const res = await client.setupMasterKey({
        salt_cifrado: salt,
        canary_cifrado,
        canary_iv,
      });

      setCryptoKey(key);
      setUnlocking(false);
      return res?.usuario || { tiene_clave_maestra: true, salt_cifrado: salt, canary_cifrado, canary_iv };
    } catch (err) {
      console.error('Error al configurar la clave maestra:', err);
      setError(`Error al configurar la clave maestra: ${err.message}`);
      setUnlocking(false);
      return null;
    }
  }, []);

  /**
   * Desbloquea el baúl derivando la CryptoKey en memoria a partir de la contraseña maestra:
   * Valida la autenticidad de la clave descifrando el mensaje canario con AES-GCM.
   */
  const unlockVault = useCallback(async (masterPassword, userCryptoParams = null) => {
    if (!masterPassword || masterPassword.trim() === '') {
      setError('Por favor ingresa una clave maestra válida.');
      return false;
    }

    setUnlocking(true);
    setError(null);

    try {
      // Usar el salt registrado del usuario (o el salt por defecto si es modo local simple)
      const salt = userCryptoParams?.salt_cifrado || DEFAULT_MOCK_SALT;
      const key = await deriveKeyFromPassword(masterPassword.trim(), salt);

      // Si el usuario tiene un canario registrado, verificar descifrado
      if (userCryptoParams?.canary_cifrado && userCryptoParams?.canary_iv) {
        try {
          const decryptedCanary = await decryptText(
            userCryptoParams.canary_cifrado,
            userCryptoParams.canary_iv,
            key
          );
          if (decryptedCanary !== CANARY_MESSAGE) {
            setError('Contraseña maestra incorrecta. Por favor verifica tu clave.');
            setUnlocking(false);
            return false;
          }
        } catch {
          // Si AES-GCM falla la autenticación de etiqueta (OperationError), la clave es incorrecta
          setError('Contraseña maestra incorrecta. Por favor verifica tu clave.');
          setUnlocking(false);
          return false;
        }
      }

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
   * Purga el baúl por completo (en caso de olvido de clave):
   * 1. Elimina todos los registros de baúles y tesoros en el backend.
   * 2. Recolecta los IDs de Google Drive y los elimina concurrentemente de la nube.
   * 3. Destruye cualquier residuo de clave en RAM y restablece el estado.
   */
  const resetVaultAndPurge = useCallback(async (googleAccessToken, isLocalMock = false) => {
    setError(null);
    try {
      const client = isLocalMock ? mockApi : api;
      const res = await client.resetVault();
      const deletedDriveFileIds = res?.deleted_drive_file_ids || [];

      // Purgar de Google Drive si no son mocks
      if (googleAccessToken && deletedDriveFileIds.length > 0) {
        await Promise.allSettled(
          deletedDriveFileIds
            .filter((id) => !id.startsWith('gdrive-mock-'))
            .map((driveFileId) =>
              deleteFileFromDrive({ driveFileId, accessToken: googleAccessToken })
            )
        );
      }

      setCryptoKey(null);
      return { ok: true, deletedCount: deletedDriveFileIds.length };
    } catch (err) {
      console.error('Error al purgar y resetear el baúl:', err);
      setError(`Error al purgar el baúl: ${err.message}`);
      return { ok: false, error: err.message };
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
    setupInitialKey,
    unlockVault,
    resetVaultAndPurge,
    lockVault,
    encryptName,
    decryptName,
    encryptFileBlob,
    decryptFileBlob,
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
