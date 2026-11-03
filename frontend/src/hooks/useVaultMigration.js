import { useCallback } from 'react';
import {
  downloadPlainFileFromDrive,
  downloadEncryptedFileFromDrive,
  uploadPlainFileToDrive,
  uploadEncryptedFileToDrive,
  deleteFileFromDrive,
} from '../services/googleDrive';
import { api } from '../services/api';

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Hook del Puente Mágico: Migración atómica de tesoros entre Modo Libre y Modo Secreto
 * 
 * Principio SOLID: Responsabilidad Única (S)
 * Maneja la descarga, descifrado/cifrado AES-GCM (256 bits) en RAM y subida cruzada en Google Drive.
 */
export function useVaultMigration({
  isUnlocked,
  isGoogleConnected,
  googleAccessToken,
  encryptName,
  decryptFileBlob,
  encryptFileBlob,
  setActionLoading,
  setUploadProgress,
  loadVaultContent,
  onSwitchMode,
  addToast,
}) {
  const handleMigrateTesoro = useCallback(async (tesoro, targetMode) => {
    if (!tesoro) return;

    if (targetMode === 'secreto') {
      // De Modo Libre a Modo Secreto
      if (!isUnlocked) {
        addToast('Para mover a Modo Secreto, primero desbloquea la bóveda con tu clave maestra.', 'warning');
        if (onSwitchMode) {
          onSwitchMode();
        }
        return;
      }

      if (tesoro.tamano_bytes > MAX_FILE_SIZE_BYTES) {
        addToast(`⚠️ "${tesoro.plainName}" supera los 500 MB y no puede cifrarse en memoria RAM.`, 'warning');
        return;
      }
      setActionLoading(true);
      setUploadProgress({
        isOpen: true,
        fileName: tesoro.plainName,
        fileSize: formatBytes(tesoro.tamano_bytes),
        stage: 'encrypting',
        statusMessage: 'Descargando y cifrando con AES-GCM (256 bits) en RAM...',
      });

      try {
        let plainBuffer;
        if (tesoro.drive_file_id.startsWith('gdrive-mock-')) {
          const driveRecord = await api.downloadDriveMock(tesoro.drive_file_id);
          plainBuffer = driveRecord.encryptedBuffer || driveRecord.buffer || driveRecord;
        } else {
          if (!isGoogleConnected || !googleAccessToken) {
            throw new Error('Debes conectar tu Google Drive para transferir este archivo');
          }
          plainBuffer = await downloadPlainFileFromDrive({
            driveFileId: tesoro.drive_file_id,
            accessToken: googleAccessToken,
          });
        }

        const { encryptedBuffer, iv: fileIv } = await encryptFileBlob(plainBuffer);
        const { nombre_cifrado, iv: nameIv } = await encryptName(tesoro.plainName);

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'uploading',
          statusMessage: isGoogleConnected && googleAccessToken
            ? 'Subiendo blob cifrado (.enc) a Google Drive...'
            : 'Guardando en almacenamiento local...',
        }));

        let newDriveFileId;
        if (isGoogleConnected && googleAccessToken) {
          const driveRes = await uploadEncryptedFileToDrive({
            encryptedBuffer,
            fileIv,
            accessToken: googleAccessToken,
          });
          newDriveFileId = driveRes.drive_file_id;
        } else {
          const mockRes = await api.uploadDriveMock(encryptedBuffer, fileIv, true);
          newDriveFileId = mockRes.drive_file_id;
        }

        if (tesoro.drive_file_id && !tesoro.drive_file_id.startsWith('gdrive-mock-') && isGoogleConnected && googleAccessToken) {
          try {
            await deleteFileFromDrive({ driveFileId: tesoro.drive_file_id, accessToken: googleAccessToken });
          } catch (driveErr) {
            console.warn('No se pudo borrar el archivo plano original de Google Drive:', driveErr);
          }
        }

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'saving',
          statusMessage: 'Blindando registro en Modo Secreto...',
        }));

        await api.updateTesoro(tesoro.id, {
          nombre_cifrado,
          iv: nameIv,
          drive_file_id: newDriveFileId,
          es_cifrado: true,
          baul_id: null,
        });

        addToast(`🛡️ Archivo "${tesoro.plainName}" protegido y movido a Raíz Secreta`, 'success');
        await loadVaultContent();
      } catch (err) {
        console.error('Error al mover tesoro a Modo Secreto:', err);
        addToast(err.message || 'Error al blindar y transferir el archivo', 'error');
      } finally {
        setActionLoading(false);
        setUploadProgress((prev) => ({ ...prev, isOpen: false }));
      }
    } else {
      // De Modo Secreto a Modo Libre
      if (tesoro.tamano_bytes > MAX_FILE_SIZE_BYTES) {
        addToast(`⚠️ "${tesoro.plainName}" supera los 500 MB y no puede cifrarse en memoria RAM.`, 'warning');
        return;
      }
      setActionLoading(true);
      setUploadProgress({
        isOpen: true,
        fileName: tesoro.plainName,
        fileSize: formatBytes(tesoro.tamano_bytes),
        stage: 'encrypting',
        statusMessage: 'Descargando y descifrando en RAM con AES-GCM (256 bits)...',
      });

      try {
        let encryptedBuffer;
        let fileIv;
        if (tesoro.drive_file_id.startsWith('gdrive-mock-')) {
          const driveRecord = await api.downloadDriveMock(tesoro.drive_file_id);
          encryptedBuffer = driveRecord.encryptedBuffer || driveRecord.buffer || driveRecord;
          fileIv = driveRecord.fileIv || tesoro.iv;
        } else {
          if (!isGoogleConnected || !googleAccessToken) {
            throw new Error('Debes conectar tu Google Drive para transferir este archivo');
          }
          const driveRecord = await downloadEncryptedFileFromDrive({
            driveFileId: tesoro.drive_file_id,
            accessToken: googleAccessToken,
            fallbackIv: tesoro.iv,
          });
          encryptedBuffer = driveRecord.encryptedBuffer;
          fileIv = driveRecord.fileIv || tesoro.iv;
        }

        const plainBuffer = await decryptFileBlob(encryptedBuffer, fileIv);

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'uploading',
          statusMessage: isGoogleConnected && googleAccessToken
            ? 'Subiendo archivo estándar a Google Drive...'
            : 'Guardando en almacenamiento local...',
        }));

        let newDriveFileId;
        if (isGoogleConnected && googleAccessToken) {
          const fileObj = new File([plainBuffer], tesoro.plainName, {
            type: tesoro.tipo_mime || 'application/octet-stream',
          });
          const driveRes = await uploadPlainFileToDrive({
            file: fileObj,
            accessToken: googleAccessToken,
          });
          newDriveFileId = driveRes.drive_file_id;
        } else {
          const mockRes = await api.uploadDriveMock(plainBuffer, null, false);
          newDriveFileId = mockRes.drive_file_id;
        }

        if (tesoro.drive_file_id && !tesoro.drive_file_id.startsWith('gdrive-mock-') && isGoogleConnected && googleAccessToken) {
          try {
            await deleteFileFromDrive({ driveFileId: tesoro.drive_file_id, accessToken: googleAccessToken });
          } catch (driveErr) {
            console.warn('No se pudo borrar el blob cifrado original de Google Drive:', driveErr);
          }
        }

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'saving',
          statusMessage: 'Registrando archivo en Mis Archivos...',
        }));

        await api.updateTesoro(tesoro.id, {
          nombre_cifrado: tesoro.plainName,
          iv: null,
          drive_file_id: newDriveFileId,
          es_cifrado: false,
          baul_id: null,
        });

        addToast(`🔓 Archivo "${tesoro.plainName}" movido a Raíz Libre`, 'success');
        await loadVaultContent();
      } catch (err) {
        console.error('Error al mover tesoro a Modo Libre:', err);
        addToast(err.message || 'Error al descifrar y transferir el archivo', 'error');
      } finally {
        setActionLoading(false);
        setUploadProgress((prev) => ({ ...prev, isOpen: false }));
      }
    }
  }, [
    isUnlocked,
    isGoogleConnected,
    googleAccessToken,
    encryptFileBlob,
    encryptName,
    decryptFileBlob,
    loadVaultContent,
    onSwitchMode,
    addToast,
    setActionLoading,
    setUploadProgress,
  ]);

  return { handleMigrateTesoro };
}
