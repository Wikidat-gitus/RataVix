import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  uploadEncryptedFileToDrive,
  downloadEncryptedFileFromDrive,
  uploadPlainFileToDrive,
  downloadPlainFileFromDrive,
  deleteFileFromDrive,
} from '../services/googleDrive';
import { api } from '../services/api';
import { getFileCategory } from '../utils/fileTypes';
import TreasureViewerModal from './TreasureViewerModal';
import ConfirmModal from './ConfirmModal';
import UploadProgressModal from './UploadProgressModal';
import baulPixelArt from '../assets/baul-pixel-art.jpg';

export default function VaultExplorer({ onLogout, mode = 'secreto', onSwitchMode }) {
  const { isUnlocked, lockVault, encryptName, decryptName, encryptFileBlob, decryptFileBlob } = useCrypto();
  const { isGoogleConnected, googleAccessToken, googleUser, refreshStorageQuota } = useGoogleAuth();

  // Navegación
  const isEncryptedMode = mode === 'secreto';
  const rootName = isEncryptedMode ? 'Raíz del Baúl Secreto' : 'Raíz de Mis Archivos';

  const [currentBaulId, setCurrentBaulId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: rootName }]);

  // Sincronizar migas de pan y limpiar nivel cuando cambia el modo
  useEffect(() => {
    setCurrentBaulId(null);
    setBreadcrumbs([{ id: null, name: rootName }]);
    setCurrentPage(1);
  }, [mode, rootName]);

  // Datos
  const [baules, setBaules] = useState([]);
  const [tesoros, setTesoros] = useState([]);
  const [allBaulesList, setAllBaulesList] = useState([]);

  // Paginación (16 elementos por página: 2 filas de 8 elementos en escritorio)
  const ITEMS_PER_PAGE = 16;
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Sistema de Notificaciones Toast Flotantes
  const [toasts, setToasts] = useState([]);

  // Drag & Drop (Arrastrar y Soltar con el Mouse)
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'baul' | 'tesoro', item: obj, name: string }
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  // Menú contextual flotante de 3 puntos (⋮)
  const [openMenuId, setOpenMenuId] = useState(null); // 'baul-${id}' | 'tesoro-${id}' | null

  // Dropzone Global para arrastrar archivos directamente desde Windows / Mac
  const [isExternalDragging, setIsExternalDragging] = useState(false);
  const dragCounter = useRef(0);

  // Modales
  const [modalMode, setModalMode] = useState(null); // 'createFolder' | 'rename' | 'move'
  const [activeItem, setActiveItem] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedTargetBaulId, setSelectedTargetBaulId] = useState(null);

  // Visor de Tesoros
  const [viewerTesoro, setViewerTesoro] = useState(null);

  // Modal Bloqueante de Progreso de Subida (Zero-Knowledge)
  const [uploadProgress, setUploadProgress] = useState({
    isOpen: false,
    fileName: '',
    fileSize: '',
    stage: 'encrypting', // 'encrypting' | 'uploading' | 'saving'
    statusMessage: '',
    percent: 0,
    bytesTransferred: '',
    speed: '',
    eta: '',
  });

  // Modal Bloqueante de Purga / Eliminación
  const [deletingProgress, setDeletingProgress] = useState({
    isDeleting: false,
    itemName: '',
    statusMessage: ''
  });

  // Modal de Confirmación
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    isDanger: false,
    onConfirm: () => {}
  });

  const fileInputRef = useRef(null);

  // Notificaciones Toast
  const addToast = (text, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Listener para el Control de Sesión Única (si se abre sesión en otro dispositivo)
  useEffect(() => {
    const handleSessionRevoked = (e) => {
      addToast(e.detail?.mensaje || 'Sesión cerrada o abierta en otro dispositivo.', 'warning');
      lockVault();
    };
    window.addEventListener('baul:session-revoked', handleSessionRevoked);
    return () => window.removeEventListener('baul:session-revoked', handleSessionRevoked);
  }, [lockVault]);

  // Listener para cerrar el menú contextual ⋮ al hacer clic afuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.card-menu-container')) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * Carga y procesa los baúles y tesoros del nivel actual según el modo activo
   */
  const loadVaultContent = useCallback(async () => {
    setLoading(true);
    try {
      // Garantizar que la sesión de backend esté activa antes de solicitar datos
      if (isGoogleConnected && googleAccessToken && !api.getToken()) {
        try {
          await api.loginGoogle({
            email: googleUser?.email || 'usuario@baulmagico.local',
            code: googleAccessToken,
          });
        } catch (e) {
          console.warn('Sincronización de sesión previa en explorador:', e);
        }
      }

      const [rawBaules, rawTesoros, allAvailable] = await Promise.all([
        api.getBaules(currentBaulId, isEncryptedMode),
        api.getTesoros(currentBaulId, isEncryptedMode),
        api.getAllBaules(isEncryptedMode)
      ]);

      // Aislamiento defensivo en cliente: garantizar separación total entre Modo Libre y Secreto
      const filteredBaules = isEncryptedMode
        ? rawBaules.filter(b => b.es_cifrado !== false && Boolean(b.iv && b.iv.trim()))
        : rawBaules.filter(b => b.es_cifrado === false || !b.iv || !b.iv.trim());

      const filteredTesoros = isEncryptedMode
        ? rawTesoros.filter(t => t.es_cifrado !== false && Boolean(t.iv && t.iv.trim()))
        : rawTesoros.filter(t => t.es_cifrado === false || !t.iv || !t.iv.trim());

      const filteredAll = isEncryptedMode
        ? allAvailable.filter(b => b.es_cifrado !== false && Boolean(b.iv && b.iv.trim()))
        : allAvailable.filter(b => b.es_cifrado === false || !b.iv || !b.iv.trim());

      const decryptedBaules = isEncryptedMode
        ? await Promise.all(
            filteredBaules.map(async (b) => {
              try {
                const plainName = await decryptName(b.nombre_cifrado, b.iv);
                return { ...b, plainName };
              } catch {
                return { ...b, plainName: 'Elemento Cifrado' };
              }
            })
          )
        : filteredBaules.map((b) => ({ ...b, plainName: b.nombre_cifrado }));

      const decryptedTesoros = isEncryptedMode
        ? await Promise.all(
            filteredTesoros.map(async (t) => {
              try {
                const plainName = await decryptName(t.nombre_cifrado, t.iv);
                return { ...t, plainName };
              } catch {
                return { ...t, plainName: 'Tesoro Cifrado' };
              }
            })
          )
        : filteredTesoros.map((t) => ({ ...t, plainName: t.nombre_cifrado }));

      const decryptedAll = isEncryptedMode
        ? await Promise.all(
            filteredAll.map(async (b) => {
              try {
                const plainName = await decryptName(b.nombre_cifrado, b.iv);
                return { ...b, plainName };
              } catch {
                return { ...b, plainName: 'Elemento Cifrado' };
              }
            })
          )
        : filteredAll.map((b) => ({ ...b, plainName: b.nombre_cifrado }));

      setBaules(decryptedBaules);
      setTesoros(decryptedTesoros);
      setAllBaulesList(decryptedAll);
    } catch (err) {
      console.error('Error al cargar contenido:', err);
      addToast('Error al cargar elementos', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentBaulId, decryptName, isEncryptedMode]);

  useEffect(() => {
    loadVaultContent();
  }, [loadVaultContent]);

  // Navegación: Entrar a subcarpeta
  const handleOpenBaul = (baul) => {
    setCurrentPage(1);
    setCurrentBaulId(baul.id);
    setBreadcrumbs((prev) => [...prev, { id: baul.id, name: baul.plainName }]);
  };

  // Navegación: Retroceder a un nivel de la miga de pan
  const handleNavigateBreadcrumb = (index) => {
    const target = breadcrumbs[index];
    setCurrentBaulId(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  // =========================================================================
  // Control de Arrastrar y Soltar (Drag & Drop)
  // =========================================================================
  const handleDragStart = (e, type, item) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id: item.id, name: item.plainName, item }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ type, item, name: item.plainName });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTargetId(null);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTargetId !== targetId) {
      setDragOverTargetId(targetId);
    }
  };

  const handleDragLeave = (e, targetId) => {
    e.preventDefault();
    if (dragOverTargetId === targetId) {
      setDragOverTargetId(null);
    }
  };

  const handleDrop = async (e, targetBaulId, targetName) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    if (!draggedItem) return;

    const { type, item, name } = draggedItem;

    // Validación 1: No soltarse en sí mismo (para baúles)
    if (type === 'baul' && item.id === targetBaulId) {
      addToast('No puedes mover una carpeta dentro de sí misma', 'error');
      setDraggedItem(null);
      return;
    }

    // Validación 2: Ya está en esa ubicación
    if (type === 'baul' && item.baul_padre_id === targetBaulId) {
      setDraggedItem(null);
      return;
    }
    if (type === 'tesoro' && item.baul_id === targetBaulId) {
      setDraggedItem(null);
      return;
    }

    setActionLoading(true);
    try {
      if (type === 'baul') {
        await api.updateBaul(item.id, { baul_padre_id: targetBaulId });
        addToast(`📁 Baúl "${name}" movido a "${targetName}"`);
      } else {
        await api.updateTesoro(item.id, { baul_id: targetBaulId });
        addToast(`🔒 Tesoro "${name}" movido a "${targetName}"`);
      }
      await loadVaultContent();
    } catch (err) {
      console.error('Error al soltar elemento:', err);
      addToast('Error al mover el elemento', 'error');
    } finally {
      setActionLoading(false);
      setDraggedItem(null);
    }
  };

  // =========================================================================
  // Control de Arrastre de Archivos desde el Sistema Operativo (Windows / Mac)
  // =========================================================================
  const handleExternalDragEnter = (e) => {
    e.preventDefault();
    if (draggedItem) return; // Si es arrastre interno de la app, ignorar
    if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
      dragCounter.current += 1;
      setIsExternalDragging(true);
    }
  };

  const handleExternalDragLeave = (e) => {
    e.preventDefault();
    if (draggedItem) return;
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsExternalDragging(false);
    }
  };

  const handleExternalDragOver = (e) => {
    e.preventDefault();
    if (draggedItem) return;
    if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleExternalDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsExternalDragging(false);

    if (draggedItem) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting) {
      addToast('Espera a que culmine la operación actual antes de subir otro archivo', 'warning');
      return;
    }

    const file = files[0];
    await processFileUpload(file);
  };

  // 1. CREAR NUEVO BAÚL (Carpeta)
  const handleOpenCreateFolder = () => {
    setInputValue('');
    setModalMode('createFolder');
  };

  const handleConfirmCreateFolder = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setActionLoading(true);
    try {
      if (isEncryptedMode) {
        const { nombre_cifrado, iv } = await encryptName(inputValue.trim());
        await api.createBaul({
          nombre_cifrado,
          iv,
          es_cifrado: true,
          baul_padre_id: currentBaulId
        });
        addToast(`Baúl secreto "${inputValue.trim()}" creado y blindado`);
      } else {
        await api.createBaul({
          nombre_cifrado: inputValue.trim(),
          iv: null,
          es_cifrado: false,
          baul_padre_id: currentBaulId
        });
        addToast(`Carpeta "${inputValue.trim()}" creada`);
      }
      setModalMode(null);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al crear carpeta:', err);
      addToast('No se pudo crear la carpeta', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 2. SUBIR TESORO (Archivo)
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFileUpload = async (file) => {
    if (!file) return;

    const formattedSize = formatBytes(file.size);
    setActionLoading(true);

    if (isEncryptedMode) {
      setUploadProgress({
        isOpen: true,
        fileName: file.name,
        fileSize: formattedSize,
        stage: 'encrypting',
        statusMessage: 'Cifrando bytes con AES-GCM (256 bits) en memoria RAM...'
      });

      try {
        addToast(`Cifrando "${file.name}" con AES-GCM 256 bits...`, 'info');

        const { encryptedBuffer, iv: fileIv } = await encryptFileBlob(file);
        const { nombre_cifrado, iv: nameIv } = await encryptName(file.name);

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'uploading',
          statusMessage: isGoogleConnected && googleAccessToken
            ? "Subiendo blob cifrado (.enc) a Google Drive..."
            : "Guardando en almacenamiento local simulado..."
        }));

        let drive_file_id;
        if (isGoogleConnected && googleAccessToken) {
          addToast(`Subiendo a carpeta 'Baúl Mágico - Datos Cifrados' en Google Drive...`, 'info');
          const driveRes = await uploadEncryptedFileToDrive({
            encryptedBuffer,
            fileIv,
            accessToken: googleAccessToken,
            onProgress: ({ percent, loaded, total, speedMBs, etaSec }) => {
              setUploadProgress((prev) => ({
                ...prev,
                stage: 'uploading',
                percent,
                bytesTransferred: `${formatBytes(loaded)} / ${formatBytes(total)}`,
                speed: speedMBs ? `${speedMBs} MB/s` : prev.speed,
                eta: etaSec !== null ? (etaSec > 60 ? `~${Math.ceil(etaSec / 60)} min` : `~${etaSec} seg`) : null,
                statusMessage: `Subiendo blob cifrado (.enc) a Google Drive (${percent}%)...`,
              }));
            },
          });
          drive_file_id = driveRes.drive_file_id;
        } else {
          const mockRes = await api.uploadDriveMock(encryptedBuffer, fileIv, true);
          drive_file_id = mockRes.drive_file_id;
        }

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'saving',
          statusMessage: 'Registrando metadatos blindados en el Baúl Secreto...'
        }));

        await api.createTesoro({
          baul_id: currentBaulId,
          drive_file_id,
          nombre_cifrado,
          iv: nameIv,
          es_cifrado: true,
          tamano_bytes: file.size,
          tipo_mime: file.type || 'application/octet-stream'
        });

        addToast(`Tesoro "${file.name}" blindado y guardado`);
        await loadVaultContent();
        refreshStorageQuota?.();
      } catch (err) {
        console.error('Error al subir archivo cifrado:', err);
        addToast(err.message || 'Error al cifrar y subir el archivo', 'error');
      } finally {
        setActionLoading(false);
        setUploadProgress((prev) => ({ ...prev, isOpen: false }));
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      // MODO LIBRE: Subida directa sin cifrado
      setUploadProgress({
        isOpen: true,
        fileName: file.name,
        fileSize: formattedSize,
        stage: 'uploading',
        statusMessage: isGoogleConnected && googleAccessToken
          ? "Subiendo archivo a 'Baúl Mágico - Mis Archivos' en Google Drive..."
          : "Guardando en almacenamiento local simulado..."
      });

      try {
        addToast(`Subiendo "${file.name}" a Mis Archivos...`, 'info');

        let drive_file_id;
        if (isGoogleConnected && googleAccessToken) {
          const driveRes = await uploadPlainFileToDrive({
            file,
            accessToken: googleAccessToken,
            onProgress: ({ percent, loaded, total, speedMBs, etaSec }) => {
              setUploadProgress((prev) => ({
                ...prev,
                stage: 'uploading',
                percent,
                bytesTransferred: `${formatBytes(loaded)} / ${formatBytes(total)}`,
                speed: speedMBs ? `${speedMBs} MB/s` : prev.speed,
                eta: etaSec !== null ? (etaSec > 60 ? `~${Math.ceil(etaSec / 60)} min` : `~${etaSec} seg`) : null,
                statusMessage: `Subiendo a Google Drive (${percent}%)...`,
              }));
            },
          });
          drive_file_id = driveRes.drive_file_id;
        } else {
          const fileBuffer = await file.arrayBuffer();
          const mockRes = await api.uploadDriveMock(fileBuffer, null, false);
          drive_file_id = mockRes.drive_file_id;
        }

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'saving',
          statusMessage: 'Registrando archivo en Mis Archivos...'
        }));

        await api.createTesoro({
          baul_id: currentBaulId,
          drive_file_id,
          nombre_cifrado: file.name,
          iv: null,
          es_cifrado: false,
          tamano_bytes: file.size,
          tipo_mime: file.type || 'application/octet-stream'
        });

        addToast(`Archivo "${file.name}" guardado exitosamente`);
        await loadVaultContent();
        refreshStorageQuota?.();
      } catch (err) {
        console.error('Error al subir archivo en Modo Libre:', err);
        addToast(err.message || 'Error al subir el archivo', 'error');
      } finally {
        setActionLoading(false);
        setUploadProgress((prev) => ({ ...prev, isOpen: false }));
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileUpload(file);
  };

  // 3. DESCARGAR Y DESCIFRAR TESORO (CON TELEMETRÍA EN VIVO)
  const handleDownloadTesoro = async (tesoro) => {
    setActionLoading(true);
    const isEncrypted = tesoro.es_cifrado === true || (tesoro.es_cifrado !== false && Boolean(tesoro.iv && tesoro.iv.trim()));

    setUploadProgress({
      isOpen: true,
      fileName: tesoro.plainName,
      fileSize: formatBytes(tesoro.tamano_bytes),
      stage: 'uploading',
      statusMessage: isEncrypted ? 'Descargando blob cifrado desde Google Drive...' : 'Descargando archivo desde Google Drive...',
      percent: 0,
      bytesTransferred: '',
      speed: '',
      eta: '',
    });

    try {
      let buffer;
      let fileIv;

      if (tesoro.drive_file_id.startsWith('gdrive-mock-')) {
        const driveRecord = await api.downloadDriveMock(tesoro.drive_file_id);
        buffer = driveRecord.encryptedBuffer || driveRecord.buffer || driveRecord;
        fileIv = driveRecord.fileIv || tesoro.iv;
      } else {
        if (!isGoogleConnected || !googleAccessToken) {
          addToast('Debes conectar tu Google Drive para descargar este archivo', 'error');
          return;
        }
        if (isEncrypted) {
          const driveRecord = await downloadEncryptedFileFromDrive({
            driveFileId: tesoro.drive_file_id,
            accessToken: googleAccessToken,
            fallbackIv: tesoro.iv,
            onProgress: ({ percent, loaded, total, speedMBs, etaSec }) => {
              setUploadProgress((prev) => ({
                ...prev,
                percent: Math.min(95, percent),
                bytesTransferred: `${formatBytes(loaded)} / ${formatBytes(total)}`,
                speed: speedMBs ? `${speedMBs} MB/s` : prev.speed,
                eta: etaSec !== null ? (etaSec > 60 ? `~${Math.ceil(etaSec / 60)} min` : `~${etaSec} seg`) : null,
                statusMessage: `Descargando blob cifrado (${percent}%)...`,
              }));
            },
          });
          buffer = driveRecord.encryptedBuffer;
          fileIv = driveRecord.fileIv || tesoro.iv;

          setUploadProgress((prev) => ({
            ...prev,
            stage: 'encrypting',
            percent: 96,
            statusMessage: 'Descifrando archivo con AES-GCM (256 bits) en memoria RAM...',
          }));
        } else {
          buffer = await downloadPlainFileFromDrive({
            driveFileId: tesoro.drive_file_id,
            accessToken: googleAccessToken,
            onProgress: ({ percent, loaded, total, speedMBs, etaSec }) => {
              setUploadProgress((prev) => ({
                ...prev,
                percent,
                bytesTransferred: `${formatBytes(loaded)} / ${formatBytes(total)}`,
                speed: speedMBs ? `${speedMBs} MB/s` : prev.speed,
                eta: etaSec !== null ? (etaSec > 60 ? `~${Math.ceil(etaSec / 60)} min` : `~${etaSec} seg`) : null,
                statusMessage: `Descargando desde Google Drive (${percent}%)...`,
              }));
            },
          });
        }
      }

      setUploadProgress((prev) => ({
        ...prev,
        percent: 100,
        statusMessage: 'Guardando archivo en tu equipo...',
      }));

      const finalArrayBuffer = isEncrypted
        ? await decryptFileBlob(buffer, fileIv)
        : buffer;

      const blob = new Blob([finalArrayBuffer], { type: tesoro.tipo_mime || 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = tesoro.plainName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      addToast(`"${tesoro.plainName}" descargado intacto.`);
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      addToast('No se pudo descargar el archivo.', 'error');
    } finally {
      setActionLoading(false);
      setUploadProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // 4. RENOMBRAR (Baúl o Tesoro)
  const handleOpenRename = (type, item) => {
    setActiveItem({ type, item, currentName: item.plainName });
    setInputValue(item.plainName);
    setModalMode('rename');
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeItem) return;

    setActionLoading(true);
    try {
      const isEncrypted = activeItem.item.es_cifrado !== false;
      let payload;

      if (isEncrypted) {
        const { nombre_cifrado, iv } = await encryptName(inputValue.trim());
        payload = { nombre_cifrado, iv };
      } else {
        payload = { nombre_cifrado: inputValue.trim(), iv: null };
      }

      if (activeItem.type === 'baul') {
        await api.updateBaul(activeItem.item.id, payload);
        addToast(`Carpeta renombrada a "${inputValue.trim()}"`);
      } else {
        await api.updateTesoro(activeItem.item.id, payload);
        addToast(`Archivo renombrado a "${inputValue.trim()}"`);
      }

      setModalMode(null);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al renombrar:', err);
      addToast('Error al renombrar el elemento', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. MOVER POR MODAL (Alternativa accesible al arrastrar)
  const handleOpenMove = (type, item) => {
    setActiveItem({ type, item, currentName: item.plainName });
    setSelectedTargetBaulId(null);
    setModalMode('move');
  };

  const handleConfirmMove = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    if (activeItem.type === 'baul' && selectedTargetBaulId === activeItem.item.id) {
      addToast('No puedes mover una carpeta dentro de sí misma', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (activeItem.type === 'baul') {
        await api.updateBaul(activeItem.item.id, { baul_padre_id: selectedTargetBaulId });
        addToast(`Baúl movido exitosamente`);
      } else {
        await api.updateTesoro(activeItem.item.id, { baul_id: selectedTargetBaulId });
        addToast(`Tesoro movido exitosamente`);
      }

      setModalMode(null);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al mover:', err);
      addToast('Error al mover el elemento', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. ELIMINAR con ConfirmModal
  const handleDeleteItem = (type, item) => {
    const isFolder = type === 'baul';
    setConfirmConfig({
      isOpen: true,
      title: isFolder ? '¿Eliminar este Baúl?' : '¿Eliminar este Tesoro?',
      message: isFolder
        ? `Se eliminará el baúl virtual "${item.plainName}" y todos los tesoros contenidos en su interior.`
        : `Se eliminará el tesoro virtual "${item.plainName}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(true);
        setDeletingProgress({
          isDeleting: true,
          itemName: item.plainName,
          statusMessage: isFolder
            ? `Eliminando baúl y recolectando archivos dependientes...`
            : `Purgando archivo cifrado de Google Drive...`
        });

        try {
          if (isFolder) {
            const delRes = await api.deleteBaul(item.id);
            if (delRes?.deleted_drive_file_ids?.length && isGoogleConnected && googleAccessToken) {
              setDeletingProgress((prev) => ({
                ...prev,
                statusMessage: `Purgando ${delRes.deleted_drive_file_ids.length} archivo(s) en Google Drive...`
              }));
              for (const driveFileId of delRes.deleted_drive_file_ids) {
                if (!driveFileId.startsWith('gdrive-mock-')) {
                  try {
                    await deleteFileFromDrive({ driveFileId, accessToken: googleAccessToken });
                  } catch (driveErr) {
                    console.warn(`No se pudo eliminar de Google Drive (${driveFileId}):`, driveErr);
                  }
                }
              }
            }
            addToast(`Baúl "${item.plainName}" y sus contenidos eliminados`);
          } else {
            if (item.drive_file_id && !item.drive_file_id.startsWith('gdrive-mock-') && isGoogleConnected && googleAccessToken) {
              await deleteFileFromDrive({ driveFileId: item.drive_file_id, accessToken: googleAccessToken });
            }
            await api.deleteTesoro(item.id);
            addToast(`Tesoro "${item.plainName}" eliminado`);
          }
          await loadVaultContent();
        } catch (err) {
          console.error('Error al eliminar:', err);
          addToast('No se pudo eliminar el elemento', 'error');
        } finally {
          setActionLoading(false);
          setDeletingProgress({ isDeleting: false, itemName: '', statusMessage: '' });
        }
      }
    });
  };

  // 7. PUENTE MÁGICO: MIGRAR TESORO ENTRE MODO LIBRE Y MODO SECRETO
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

        addToast(`🛡️ Tesoro "${tesoro.plainName}" protegido y movido a la Raíz de Modo Secreto`, 'success');
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

        addToast(`🔓 Archivo "${tesoro.plainName}" movido a la Raíz de Mis Archivos`, 'success');
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
  ]);

  // Escuchar eventos globales de migración y notificaciones (desde pills de App.jsx u otros componentes)
  useEffect(() => {
    const handleMigrateEvent = (e) => {
      if (e.detail?.tesoro && e.detail?.targetMode) {
        handleMigrateTesoro(e.detail.tesoro, e.detail.targetMode);
      }
    };
    const handleCustomToast = (e) => {
      if (e.detail?.message) {
        addToast(e.detail.message, e.detail.type || 'info');
      }
    };
    window.addEventListener('baul:migrate-tesoro', handleMigrateEvent);
    window.addEventListener('baul:toast', handleCustomToast);
    return () => {
      window.removeEventListener('baul:migrate-tesoro', handleMigrateEvent);
      window.removeEventListener('baul:toast', handleCustomToast);
    };
  }, [handleMigrateTesoro]);

  // Cálculo de elementos totales y paginación
  const totalItems = baules.length + tesoros.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedBaules = baules.slice(
    Math.min(startIndex, baules.length),
    Math.min(endIndex, baules.length)
  );

  const tesorosStartIndex = Math.max(0, startIndex - baules.length);
  const tesorosEndIndex = Math.max(0, endIndex - baules.length);
  const paginatedTesoros = tesoros.slice(tesorosStartIndex, tesorosEndIndex);

  return (
    <div
      className={`vault-explorer ${isExternalDragging ? 'external-drag-active' : ''}`}
      onDragEnter={handleExternalDragEnter}
      onDragOver={handleExternalDragOver}
      onDragLeave={handleExternalDragLeave}
      onDrop={handleExternalDrop}
    >
      {/* Overlay Mágico de Dropzone Global desde Windows / Mac */}
      {isExternalDragging && (
        <div
          className="external-drop-overlay"
          onDragOver={handleExternalDragOver}
          onDragLeave={handleExternalDragLeave}
          onDrop={handleExternalDrop}
        >
          <div className="external-drop-content">
            <div className="drop-pulse-icon">✨</div>
            <h3>¡Suelta tu archivo aquí!</h3>
            <p>
              Se cifrará en tu navegador con <strong>AES-GCM (256 bits)</strong> antes de subirse a este baúl.
            </p>
            <div className="drop-badge">
              <span>🛡️ Cero Conocimiento • Subida Protegida</span>
            </div>
          </div>
        </div>
      )}

      {/* Barra Unificada de Navegación y Acciones Rápidas */}
      <div className="explorer-toolbar">
        {/* Migas de Pan (Breadcrumbs) con soporte para Drop Target */}
        <nav className="breadcrumbs-bar">
          <span className="breadcrumbs-icon">🧭</span>
          {breadcrumbs.map((crumb, idx) => {
            const isCurrent = idx === breadcrumbs.length - 1;
            const targetKey = crumb.id || 'root';
            const isOver = dragOverTargetId === targetKey;

            return (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <span className="breadcrumb-separator">/</span>}
                <button
                  type="button"
                  className={`breadcrumb-link ${isCurrent ? 'current' : ''} ${isOver ? 'drop-hover' : ''}`}
                  onClick={() => handleNavigateBreadcrumb(idx)}
                  onDragOver={(e) => {
                    if (!isCurrent) handleDragOver(e, targetKey);
                  }}
                  onDragLeave={(e) => {
                    if (!isCurrent) handleDragLeave(e, targetKey);
                  }}
                  onDrop={(e) => {
                    if (!isCurrent) handleDrop(e, crumb.id, crumb.name);
                  }}
                  title={!isCurrent ? `Arrastra aquí para mover a "${crumb.name}"` : undefined}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Botones de Acción en la barra de herramientas */}
        <div className="toolbar-actions">
          <button
            type="button"
            className="btn-action btn-new-folder"
            onClick={handleOpenCreateFolder}
            disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
            title={isEncryptedMode ? "Crear un nuevo baúl virtual blindado" : "Crear una nueva carpeta"}
          >
            <span>📁+</span>
            <span>{isEncryptedMode ? "Nuevo Baúl" : "Nueva Carpeta"}</span>
          </button>

          <button
            type="button"
            className="btn-action btn-upload"
            onClick={handleTriggerUpload}
            disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
            title={isEncryptedMode ? "Subir y cifrar un archivo con AES-GCM 256 bits" : "Subir un archivo a Google Drive"}
          >
            <span>⬆️</span>
            <span>{isEncryptedMode ? "Subir Tesoro" : "Subir Archivo"}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelected}
            style={{ display: 'none' }}
            disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
          />
        </div>
      </div>

      {/* Contenido: Listado de Baúles y Tesoros */}
      <div className="explorer-content">
        {loading ? (
          <div className="vault-loading-state">
            <span className="spinner-dot"></span>
            <p>{isEncryptedMode ? "Descifrando metadatos en tu navegador..." : "Cargando tus archivos..."}</p>
          </div>
        ) : baules.length === 0 && tesoros.length === 0 ? (
          <div className="vault-empty-state">
            <div className="empty-state-icon">📂</div>
            <h3>{isEncryptedMode ? "Bóveda secreta vacía" : "Esta carpeta está vacía"}</h3>
            <p className="empty-state-hint">
              {isEncryptedMode
                ? "Sube archivos o arrástralos aquí para blindarlos con cifrado AES-256."
                : "Arrastra archivos aquí desde tu explorador o usa las acciones rápidas."}
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn-action btn-upload"
                onClick={handleTriggerUpload}
                disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
              >
                <span>⬆️</span>
                <span>{isEncryptedMode ? "Subir Tesoro" : "Subir Archivo"}</span>
              </button>
              <button
                type="button"
                className="btn-action btn-new-folder"
                onClick={handleOpenCreateFolder}
                disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
              >
                <span>📁+</span>
                <span>{isEncryptedMode ? "Nuevo Baúl" : "Nueva Carpeta"}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="explorer-grid">
            {/* 1. Carpetas / Baúles (Draggable y Drop Target) */}
            {paginatedBaules.map((baul) => {
              const isDragging = draggedItem?.type === 'baul' && draggedItem.item.id === baul.id;
              const isDropHover = dragOverTargetId === baul.id;

              return (
                <div
                  key={baul.id}
                  className={`explorer-card folder-card ${isDragging ? 'is-dragging' : ''} ${isDropHover ? 'drop-hover' : ''}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, 'baul', baul)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, baul.id)}
                  onDragLeave={(e) => handleDragLeave(e, baul.id)}
                  onDrop={(e) => handleDrop(e, baul.id, baul.plainName)}
                  onDoubleClick={() => handleOpenBaul(baul)}
                  onClick={() => handleOpenBaul(baul)}
                  title={baul.plainName}
                >
                  {/* Botón de 3 Puntos en la Esquina Superior Derecha del Mosaico */}
                  <div className="card-menu-container" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`item-btn btn-menu-trigger ${openMenuId === `baul-${baul.id}` ? 'active' : ''}`}
                      title="Opciones de carpeta"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === `baul-${baul.id}` ? null : `baul-${baul.id}`);
                      }}
                    >
                      ⋮
                    </button>
                    {openMenuId === `baul-${baul.id}` && (
                      <div className="card-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleOpenBaul(baul);
                          }}
                        >
                          <span className="dropdown-icon">📂</span>
                          <span>Abrir baúl</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleOpenRename('baul', baul);
                          }}
                        >
                          <span className="dropdown-icon">✏️</span>
                          <span>Renombrar</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleOpenMove('baul', baul);
                          }}
                        >
                          <span className="dropdown-icon">📦</span>
                          <span>Mover a...</span>
                        </button>
                        <div className="dropdown-divider"></div>
                        <button
                          type="button"
                          className="dropdown-item dropdown-item-danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDeleteItem('baul', baul);
                          }}
                        >
                          <span className="dropdown-icon">🗑️</span>
                          <span>Eliminar baúl</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="card-icon-wrapper folder-icon">
                    <span className="card-icon-symbol">📁</span>
                  </div>

                  <span className="card-title" title={baul.plainName}>
                    {baul.plainName}
                  </span>
                </div>
              );
            })}

            {/* 2. Archivos / Tesoros (Draggable) */}
            {paginatedTesoros.map((tesoro) => {
              const category = getFileCategory(tesoro.plainName, tesoro.tipo_mime);
              const isDragging = draggedItem?.type === 'tesoro' && draggedItem.item.id === tesoro.id;

              return (
                <div
                  key={tesoro.id}
                  className={`explorer-card file-card ${isDragging ? 'is-dragging' : ''}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, 'tesoro', tesoro)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setViewerTesoro(tesoro)}
                  title={`${tesoro.plainName} (${formatBytes(tesoro.tamano_bytes)})`}
                >
                  {/* Botón de 3 Puntos en la Esquina Superior Derecha del Mosaico */}
                  <div className="card-menu-container" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`item-btn btn-menu-trigger ${openMenuId === `tesoro-${tesoro.id}` ? 'active' : ''}`}
                      title="Opciones de archivo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === `tesoro-${tesoro.id}` ? null : `tesoro-${tesoro.id}`);
                      }}
                    >
                      ⋮
                    </button>
                    {openMenuId === `tesoro-${tesoro.id}` && (
                      <div className="card-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            setViewerTesoro(tesoro);
                          }}
                        >
                          <span className="dropdown-icon">👁️</span>
                          <span>Previsualizar</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDownloadTesoro(tesoro);
                          }}
                        >
                          <span className="dropdown-icon">⬇️</span>
                          <span>{isEncryptedMode ? "Descargar descifrado" : "Descargar archivo"}</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleOpenRename('tesoro', tesoro);
                          }}
                        >
                          <span className="dropdown-icon">✏️</span>
                          <span>Renombrar</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleOpenMove('tesoro', tesoro);
                          }}
                        >
                          <span className="dropdown-icon">📦</span>
                          <span>Mover a carpeta...</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleMigrateTesoro(tesoro, isEncryptedMode ? 'libre' : 'secreto');
                          }}
                          title={isEncryptedMode ? 'Mover a la Raíz de Modo Libre' : 'Blindar con Conocimiento Cero y mover a Modo Secreto'}
                        >
                          <span className="dropdown-icon">{isEncryptedMode ? '🔓' : '🛡️'}</span>
                          <span>{isEncryptedMode ? 'Mover a Modo Libre' : 'Mover a Modo Secreto'}</span>
                        </button>
                        <div className="dropdown-divider"></div>
                        <button
                          type="button"
                          className="dropdown-item dropdown-item-danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDeleteItem('tesoro', tesoro);
                          }}
                        >
                          <span className="dropdown-icon">🗑️</span>
                          <span>Eliminar tesoro</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`card-icon-wrapper file-icon ${category.badgeClass}-icon`}>
                    <span className="card-icon-symbol">{category.icon}</span>
                  </div>

                  <span className="card-title" title={tesoro.plainName}>
                    {tesoro.plainName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Paginación Centrada Limpia (Solo botones de navegación si hay más de 1 página) */}
          {totalPages > 1 && (
            <div className="explorer-pagination">
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Página anterior"
                >
                  ‹ Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`btn-page-number ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Página siguiente"
                >
                  Siguiente ›
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* MODAL 1: Crear o Renombrar */}
      {(modalMode === 'createFolder' || modalMode === 'rename') && (
        <div className="modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalMode === 'createFolder'
                ? '📁 Crear Nuevo Baúl'
                : `✏️ Renombrar ${activeItem?.type === 'baul' ? 'Baúl' : 'Tesoro'}`}
            </h3>
            <p className="modal-description">
              El nombre se cifrará con AES-GCM antes de guardarse en el sistema.
            </p>

            <form
              onSubmit={
                modalMode === 'createFolder'
                  ? handleConfirmCreateFolder
                  : handleConfirmRename
              }
            >
              <input
                type="text"
                className="input-field"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nombre del baúl o tesoro..."
                autoFocus
                required
              />

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalMode(null)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={actionLoading || !inputValue.trim()}
                >
                  {actionLoading ? 'Guardando...' : 'Guardar Cifrado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Mover elemento */}
      {modalMode === 'move' && activeItem && (
        <div className="modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>📦 Mover "{activeItem.currentName}"</h3>
            <p className="modal-description">
              Selecciona el baúl de destino donde deseas ubicar este elemento:
            </p>

            <form onSubmit={handleConfirmMove}>
              <select
                className="input-field select-field"
                value={selectedTargetBaulId || ''}
                onChange={(e) => setSelectedTargetBaulId(e.target.value || null)}
              >
                <option value="">📂 [Raíz del Baúl Principal]</option>
                {allBaulesList
                  .filter((b) => b.id !== activeItem.item.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      📁 {b.plainName}
                    </option>
                  ))}
              </select>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalMode(null)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-confirm" disabled={actionLoading}>
                  {actionLoading ? 'Moviendo...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Visor de Tesoros en Vivo */}
      {viewerTesoro && (
        <TreasureViewerModal
          tesoro={viewerTesoro}
          onClose={() => setViewerTesoro(null)}
          onDownload={handleDownloadTesoro}
        />
      )}

      {/* MODAL 4: Confirmación Suave */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* MODAL 5: Overlay Bloqueante de Subida Protegida (Zero-Knowledge) */}
      <UploadProgressModal
        isOpen={uploadProgress.isOpen}
        fileName={uploadProgress.fileName}
        fileSize={uploadProgress.fileSize}
        stage={uploadProgress.stage}
        statusMessage={uploadProgress.statusMessage}
        percent={uploadProgress.percent}
        bytesTransferred={uploadProgress.bytesTransferred}
        speed={uploadProgress.speed}
        eta={uploadProgress.eta}
      />

      {/* MODAL 6: Overlay Bloqueante de Purga y Eliminación */}
      {deletingProgress.isDeleting && (
        <div className="modal-backdrop upload-overlay-backdrop" role="dialog" aria-modal="true">
          <div className="modal-box upload-progress-box deletion-progress-box" onClick={(e) => e.stopPropagation()}>
            <div className="upload-header">
              <div className="upload-pulse-orb stage-delete">
                <span className="upload-orb-icon">🗑️</span>
              </div>
              <div className="upload-title-area">
                <h3>Eliminando Elemento</h3>
                <span className="upload-step-badge delete-badge">Sincronizando con Drive</span>
              </div>
            </div>

            <div className="upload-file-card">
              <span className="upload-file-icon">📦</span>
              <div className="upload-file-info">
                <strong className="upload-file-name" title={deletingProgress.itemName}>
                  {deletingProgress.itemName}
                </strong>
                <span className="upload-file-size">Purgando archivo y metadatos de forma segura</span>
              </div>
            </div>

            <div className="upload-status-box">
              <div className="upload-spinner-ring delete-spinner"></div>
              <p className="upload-status-text">
                {deletingProgress.statusMessage}
              </p>
            </div>

            <div className="upload-security-hint delete-hint">
              <span>⏳</span>
              <p>
                Por favor espera mientras se confirma la eliminación en Google Drive y la base de datos...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Contenedor de Notificaciones Toast Flotantes */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="toast-icon">
              {toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}
            </span>
            <span className="toast-text">{toast.text}</span>
            <button
              type="button"
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
