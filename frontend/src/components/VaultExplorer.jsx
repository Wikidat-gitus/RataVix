import './VaultExplorer.css';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import TreasureViewerModal from './TreasureViewerModal';
import FolderActionModals from './FolderActionModals';
import ExplorerGrid from './ExplorerGrid';
import ToastContainer from './ToastContainer';
import { useVaultMigration } from '../hooks/useVaultMigration';
import ConfirmModal from './ConfirmModal';
import UploadProgressModal from './UploadProgressModal';
import baulPixelArt from '../assets/baul-pixel-art.jpg';

// Límite máximo preventivo de subida para proteger la memoria RAM del navegador
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export default function VaultExplorer({ onLogout, mode = 'secreto', onSwitchMode, searchQuery = '', onClearSearch, appTheme = 'normal' }) {
  const { isUnlocked, lockVault, encryptName, decryptName, encryptFileBlob, decryptFileBlob } = useCrypto();
  const { isGoogleConnected, googleAccessToken, googleUser, refreshStorageQuota } = useGoogleAuth();

  // Navegación
  const isEncryptedMode = mode === 'secreto';
  const rootName = isEncryptedMode ? 'Raíz Secreta' : 'Raíz Libre';

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
  const [loadingMoveTargets, setLoadingMoveTargets] = useState(false);

  // Paginación: 16 en Moderno (2 filas x 8), 4 en Pixel Art (1 fila con iconos grandes cuadrados)
  const isPixelMode = appTheme === 'pixel';
  const ITEMS_PER_PAGE = isPixelMode ? 4 : 16;
  const [currentPage, setCurrentPage] = useState(1);
  const [slideDirection, setSlideDirection] = useState('none'); // 'left' | 'right' | 'none'

  const handlePageChange = (newPage, direction) => {
    setSlideDirection(direction);
    setCurrentPage(newPage);
  };
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

  // Cerrar cualquier reproducción activa si se cambia de modo (Libre <-> Secreto)
  useEffect(() => {
    setViewerTesoro(null);
  }, [mode]);

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

      const [rawBaules, rawTesoros] = await Promise.all([
        api.getBaules(currentBaulId, isEncryptedMode),
        api.getTesoros(currentBaulId, isEncryptedMode)
      ]);

      // Aislamiento defensivo en cliente: garantizar separación total entre Modo Libre y Secreto
      const filteredBaules = isEncryptedMode
        ? rawBaules.filter(b => b.es_cifrado !== false && Boolean(b.iv && b.iv.trim()))
        : rawBaules.filter(b => b.es_cifrado === false || !b.iv || !b.iv.trim());

      const filteredTesoros = isEncryptedMode
        ? rawTesoros.filter(t => t.es_cifrado !== false && Boolean(t.iv && t.iv.trim()))
        : rawTesoros.filter(t => t.es_cifrado === false || !t.iv || !t.iv.trim());


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
                return { ...t, plainName: 'Archivo Cifrado' };
              }
            })
          )
        : filteredTesoros.map((t) => ({ ...t, plainName: t.nombre_cifrado }));


      setBaules(decryptedBaules);
      setTesoros(decryptedTesoros);

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
        addToast(`📁 Carpeta "${name}" movida a "${targetName}"`);
      } else {
        await api.updateTesoro(item.id, { baul_id: targetBaulId });
        addToast(`🔒 Archivo "${name}" movido a "${targetName}"`);
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
    const cleanName = inputValue.trim();
    if (!cleanName) return;

    // Validación anti-duplicados para carpetas en el mismo nivel
    const isDuplicate = baules.some(
      (b) => (b.plainName || '').trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      addToast(`Ya existe una carpeta con el nombre "${cleanName}" en esta ubicación`, 'warning');
      return;
    }

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
        addToast(`Carpeta secreta "${inputValue.trim()}" creada y blindada`);
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

  // Genera un nombre único con sufijo numérico para evitar colisiones (estilo Windows Explorer: archivo (1).ext)
  const getUniqueName = (originalName, existingNamesList) => {
    const existingSet = new Set(existingNamesList.map((n) => (n || '').trim().toLowerCase()));
    const trimmed = (originalName || '').trim();

    if (!existingSet.has(trimmed.toLowerCase())) {
      return trimmed;
    }

    const lastDot = trimmed.lastIndexOf('.');
    let baseName = trimmed;
    let extension = '';

    if (lastDot > 0) {
      baseName = trimmed.substring(0, lastDot);
      extension = trimmed.substring(lastDot);
    }

    let counter = 1;
    let candidate = `${baseName} (${counter})${extension}`;
    while (existingSet.has(candidate.toLowerCase())) {
      counter++;
      candidate = `${baseName} (${counter})${extension}`;
    }

    return candidate;
  };

  // 2. SUBIR TESORO (Archivo)
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFileUpload = async (file) => {
    if (!file) return;

    // Blindaje de memoria: interceptar antes de leer bytes a la memoria RAM
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeText = formatBytes(file.size);
      addToast(`⚠️ "${file.name}" (${sizeText}) supera el límite de 500 MB. Para evitar congelar el navegador, sube archivos menores a 500 MB.`, 'warning');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const existingNames = tesoros.map((t) => t.plainName || '');
    const finalFileName = getUniqueName(file.name, existingNames);
    if (finalFileName !== file.name) {
      addToast(`"${file.name}" ya existe. Se guardará como "${finalFileName}"`, 'info');
    }

    const formattedSize = formatBytes(file.size);
    setActionLoading(true);

    if (isEncryptedMode) {
      setUploadProgress({
        isOpen: true,
        fileName: finalFileName,
        fileSize: formattedSize,
        stage: 'encrypting',
        statusMessage: 'Cifrando bytes con AES-GCM (256 bits) en memoria RAM...'
      });

      try {
        addToast(`Cifrando "${finalFileName}" con AES-GCM 256 bits...`, 'info');

        const { encryptedBuffer, iv: fileIv } = await encryptFileBlob(file);
        const { nombre_cifrado, iv: nameIv } = await encryptName(finalFileName);

        setUploadProgress((prev) => ({
          ...prev,
          stage: 'uploading',
          statusMessage: isGoogleConnected && googleAccessToken
            ? "Subiendo blob cifrado (.enc) a Google Drive..."
            : "Guardando en almacenamiento local simulado..."
        }));

        let drive_file_id;
        if (isGoogleConnected && googleAccessToken) {
          addToast(`Subiendo a 'RataVix - Secret Files' en Google Drive...`, 'info');
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
          statusMessage: 'Registrando metadatos blindados en la Raíz Secreta...'
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

        addToast(`Archivo "${finalFileName}" blindado y guardado`);
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
        fileName: finalFileName,
        fileSize: formattedSize,
        stage: 'uploading',
        statusMessage: isGoogleConnected && googleAccessToken
          ? "Subiendo archivo a 'RataVix - Free Files' en Google Drive..."
          : "Guardando en almacenamiento local simulado..."
      });

      try {
        addToast(`Subiendo "${finalFileName}" a RataVix Free Files...`, 'info');

        let drive_file_id;
        if (isGoogleConnected && googleAccessToken) {
          const driveRes = await uploadPlainFileToDrive({
            file,
            customName: finalFileName,
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
          nombre_cifrado: finalFileName,
          iv: null,
          es_cifrado: false,
          tamano_bytes: file.size,
          tipo_mime: file.type || 'application/octet-stream'
        });

        addToast(`Archivo "${finalFileName}" guardado exitosamente`);
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

    // Blindaje de memoria: interceptar antes de leer bytes a la memoria RAM
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeText = formatBytes(file.size);
      addToast(`⚠️ "${file.name}" (${sizeText}) supera el límite de 500 MB. Para evitar congelar el navegador, sube archivos menores a 500 MB.`, 'warning');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
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
    const cleanName = inputValue.trim();
    if (!cleanName || !activeItem) return;

    if (cleanName.toLowerCase() === (activeItem.item.plainName || '').trim().toLowerCase()) {
      setModalMode(null);
      return;
    }

    if (activeItem.type === 'baul') {
      const isDuplicate = baules.some(
        (b) => b.id !== activeItem.item.id && (b.plainName || '').trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (isDuplicate) {
        addToast(`Ya existe una carpeta con el nombre "${cleanName}" en esta ubicación`, 'warning');
        return;
      }
    } else {
      const isDuplicate = tesoros.some(
        (t) => t.id !== activeItem.item.id && (t.plainName || '').trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (isDuplicate) {
        addToast(`Ya existe un archivo con el nombre "${cleanName}" en esta carpeta`, 'warning');
        return;
      }
    }

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

  // Carga y descifra la lista completa de carpetas bajo demanda (Lazy Loading exclusivo para el modal 'Mover')
  const loadMoveTargets = useCallback(async () => {
    setLoadingMoveTargets(true);
    try {
      const allAvailable = await api.getAllBaules(isEncryptedMode);
      const filteredAll = isEncryptedMode
        ? allAvailable.filter(b => b.es_cifrado !== false && Boolean(b.iv && b.iv.trim()))
        : allAvailable.filter(b => b.es_cifrado === false || !b.iv || !b.iv.trim());

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

      setAllBaulesList(decryptedAll);
    } catch (err) {
      console.error('Error al cargar carpetas para mover:', err);
    } finally {
      setLoadingMoveTargets(false);
    }
  }, [decryptName, isEncryptedMode]);

  // 5. MOVER POR MODAL (Alternativa accesible al arrastrar)
  const handleOpenMove = (type, item) => {
    setActiveItem({ type, item, currentName: item.plainName });
    setSelectedTargetBaulId(null);
    setModalMode('move');
    loadMoveTargets();
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
        addToast(`Carpeta movida exitosamente`);
      } else {
        await api.updateTesoro(activeItem.item.id, { baul_id: selectedTargetBaulId });
        addToast(`Archivo movido exitosamente`);
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
      title: isFolder ? '¿Eliminar esta Carpeta?' : '¿Eliminar este Archivo?',
      message: isFolder
        ? `Se eliminará la carpeta "${item.plainName}" y todos los archivos contenidos en su interior.`
        : `Se eliminará el archivo "${item.plainName}". Esta acción no se puede deshacer.`,
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
            ? `Eliminando carpeta y recolectando archivos dependientes...`
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
            addToast(`Carpeta "${item.plainName}" y sus contenidos eliminados`);
          } else {
            if (item.drive_file_id && !item.drive_file_id.startsWith('gdrive-mock-') && isGoogleConnected && googleAccessToken) {
              await deleteFileFromDrive({ driveFileId: item.drive_file_id, accessToken: googleAccessToken });
            }
            await api.deleteTesoro(item.id);
            addToast(`Archivo "${item.plainName}" eliminado`);
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

  // 7. PUENTE MÁGICO: MIGRAR TESORO ENTRE MODO LIBRE Y MODO SECRETO (Hook Modular SOLID)
  const { handleMigrateTesoro } = useVaultMigration({
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
  });

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

  // Filtrado en tiempo real con el buscador
  const filteredBaules = useMemo(() => {
    if (!searchQuery?.trim()) return baules;
    const q = searchQuery.trim().toLowerCase();
    return baules.filter((b) => (b.plainName || '').toLowerCase().includes(q));
  }, [baules, searchQuery]);

  const filteredTesoros = useMemo(() => {
    if (!searchQuery?.trim()) return tesoros;
    const q = searchQuery.trim().toLowerCase();
    return tesoros.filter((t) => (t.plainName || '').toLowerCase().includes(q));
  }, [tesoros, searchQuery]);

  // Si cambia la búsqueda o el modo de tema, reiniciar página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, appTheme]);

  // Cálculo de elementos totales y paginación
  const totalItems = filteredBaules.length + filteredTesoros.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedBaules = filteredBaules.slice(
    Math.min(startIndex, filteredBaules.length),
    Math.min(endIndex, filteredBaules.length)
  );

  const tesorosStartIndex = Math.max(0, startIndex - filteredBaules.length);
  const tesorosEndIndex = Math.max(0, endIndex - filteredBaules.length);
  const paginatedTesoros = filteredTesoros.slice(tesorosStartIndex, tesorosEndIndex);

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
              Se cifrará en tu navegador con <strong>AES-GCM (256 bits)</strong> antes de subirse a esta carpeta.
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
            title={isEncryptedMode ? "Crear una nueva carpeta secreta blindada" : "Crear una nueva carpeta"}
          >
            <span>📁+</span>
            <span>Nueva Carpeta</span>
          </button>

          <button
            type="button"
            className="btn-action btn-upload"
            onClick={handleTriggerUpload}
            disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
            title={isEncryptedMode ? "Subir y cifrar un archivo con AES-GCM 256 bits" : "Subir un archivo a Google Drive"}
          >
            <span>⬆️</span>
            <span>Subir Archivo</span>
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
        ) : totalItems === 0 ? (
          searchQuery.trim() ? (
            <div className="search-empty-state">
              <span className="search-empty-icon">🔍</span>
              <h3>Sin resultados</h3>
              <p>No se encontraron carpetas ni archivos que contengan "<strong>{searchQuery}</strong>" en este nivel.</p>
              {onClearSearch && (
                <button type="button" className="btn-cancel" onClick={onClearSearch}>
                  ✕ Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
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
                <span>Subir Archivo</span>
              </button>
              <button
                type="button"
                className="btn-action btn-new-folder"
                onClick={handleOpenCreateFolder}
                disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
              >
                <span>📁+</span>
                <span>Nueva Carpeta</span>
              </button>
            </div>
          </div>
          )
        ) : (
          <>
            <ExplorerGrid
              paginatedBaules={paginatedBaules}
              paginatedTesoros={paginatedTesoros}
              isPixelMode={isPixelMode}
              currentPage={currentPage}
              slideDirection={slideDirection}
              draggedItem={draggedItem}
              dragOverTargetId={dragOverTargetId}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              isEncryptedMode={isEncryptedMode}
              onOpenBaul={handleOpenBaul}
              onOpenRename={handleOpenRename}
              onOpenMove={handleOpenMove}
              onDeleteItem={handleDeleteItem}
              onDownloadTesoro={handleDownloadTesoro}
              onMigrateTesoro={handleMigrateTesoro}
              onPreviewTesoro={setViewerTesoro}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />

          {/* Paginación Centrada Abajo */}
          {totalPages > 1 && (
            isPixelMode ? (
              <div className="pixel-pagination-container">
                <button
                  type="button"
                  className="pixel-pager-btn"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1), 'left')}
                  disabled={currentPage === 1}
                  title="Página anterior"
                >
                  ◀
                </button>
                <div className="pixel-counter-badge">
                  <span>PÁGINA {currentPage} / {totalPages}</span>
                </div>
                <button
                  type="button"
                  className="pixel-pager-btn"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1), 'right')}
                  disabled={currentPage === totalPages}
                  title="Página siguiente"
                >
                  ▶
                </button>
              </div>
            ) : (
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
            )
          )}
          </>
        )}
      </div>

      {/* MODALES DE ACCIÓN (Crear Carpeta, Renombrar, Mover) — Principio SOLID (S) */}
      <FolderActionModals
        modalMode={modalMode}
        activeItem={activeItem}
        isEncryptedMode={isEncryptedMode}
        inputValue={inputValue}
        setInputValue={setInputValue}
        actionLoading={actionLoading}
        selectedTargetBaulId={selectedTargetBaulId}
        setSelectedTargetBaulId={setSelectedTargetBaulId}
        allBaulesList={allBaulesList}
        loadingMoveTargets={loadingMoveTargets}
        onClose={() => setModalMode(null)}
        onConfirmCreateFolder={handleConfirmCreateFolder}
        onConfirmRename={handleConfirmRename}
        onConfirmMove={handleConfirmMove}
      />

      {/* MODAL 2: Mover elemento */}
      {modalMode === 'move' && activeItem && (
        <div className="modal-backdrop">
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setModalMode(null)}
              disabled={actionLoading}
              title="Cerrar ventana"
            >
              ✕
            </button>
            <h3>📦 Mover "{activeItem.currentName}"</h3>
            <p className="modal-description">
              Selecciona la carpeta de destino donde deseas ubicar este elemento:
            </p>

            <form onSubmit={handleConfirmMove}>
              <select
                className="input-field select-field"
                value={selectedTargetBaulId || ''}
                onChange={(e) => setSelectedTargetBaulId(e.target.value || null)}
                disabled={loadingMoveTargets}
              >
                <option value="">📂 [{isEncryptedMode ? 'Raíz Secreta' : 'Raíz Libre'}]</option>
                {loadingMoveTargets ? (
                  <option disabled>⏳ Descifrando carpetas disponibles...</option>
                ) : (
                  allBaulesList
                    .filter((b) => b.id !== activeItem.item.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        📁 {b.plainName}
                      </option>
                    ))
                )}
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

      {/* Notificaciones Toast Flotantes — Principio SOLID (S) */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
