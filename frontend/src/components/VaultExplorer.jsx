import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  uploadEncryptedFileToDrive,
  downloadEncryptedFileFromDrive,
  deleteFileFromDrive,
} from '../services/googleDrive';
import { api } from '../services/api';
import { getFileCategory } from '../utils/fileTypes';
import TreasureViewerModal from './TreasureViewerModal';
import ConfirmModal from './ConfirmModal';
import UploadProgressModal from './UploadProgressModal';
import baulPixelArt from '../assets/baul-pixel-art.jpg';

export default function VaultExplorer({ onLogout }) {
  const { lockVault, encryptName, decryptName, encryptFileBlob, decryptFileBlob } = useCrypto();
  const { isGoogleConnected, googleAccessToken } = useGoogleAuth();

  // Navegación
  const [currentBaulId, setCurrentBaulId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Raíz del Baúl' }]);

  // Datos
  const [baules, setBaules] = useState([]);
  const [tesoros, setTesoros] = useState([]);
  const [allBaulesList, setAllBaulesList] = useState([]);
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
    statusMessage: ''
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
   * Carga y descifra los baúles y tesoros del nivel actual
   */
  const loadVaultContent = useCallback(async () => {
    setLoading(true);
    try {
      const [rawBaules, rawTesoros, allAvailable] = await Promise.all([
        api.getBaules(currentBaulId),
        api.getTesoros(currentBaulId),
        api.getAllBaules()
      ]);

      const decryptedBaules = await Promise.all(
        rawBaules.map(async (b) => {
          const plainName = await decryptName(b.nombre_cifrado, b.iv);
          return { ...b, plainName };
        })
      );

      const decryptedTesoros = await Promise.all(
        rawTesoros.map(async (t) => {
          const plainName = await decryptName(t.nombre_cifrado, t.iv);
          return { ...t, plainName };
        })
      );

      const decryptedAll = await Promise.all(
        allAvailable.map(async (b) => {
          const plainName = await decryptName(b.nombre_cifrado, b.iv);
          return { ...b, plainName };
        })
      );

      setBaules(decryptedBaules);
      setTesoros(decryptedTesoros);
      setAllBaulesList(decryptedAll);
    } catch (err) {
      console.error('Error al cargar contenido del baúl:', err);
      addToast('Error al cargar elementos del baúl', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentBaulId, decryptName]);

  useEffect(() => {
    loadVaultContent();
  }, [loadVaultContent]);

  // Navegación: Entrar a subcarpeta
  const handleOpenBaul = (baul) => {
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
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id: item.id, name: item.plainName }));
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
      const { nombre_cifrado, iv } = await encryptName(inputValue.trim());
      await api.createBaul({
        nombre_cifrado,
        iv,
        baul_padre_id: currentBaulId
      });
      addToast(`Baúl "${inputValue.trim()}" creado y cifrado`);
      setModalMode(null);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al crear baúl:', err);
      addToast('No se pudo crear el baúl', 'error');
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
        });
        drive_file_id = driveRes.drive_file_id;
      } else {
        const mockRes = await api.uploadDriveMock(encryptedBuffer, fileIv);
        drive_file_id = mockRes.drive_file_id;
      }

      setUploadProgress((prev) => ({
        ...prev,
        stage: 'saving',
        statusMessage: 'Registrando metadatos blindados en el Baúl...'
      }));

      await api.createTesoro({
        baul_id: currentBaulId,
        drive_file_id,
        nombre_cifrado,
        iv: nameIv,
        tamano_bytes: file.size,
        tipo_mime: file.type || 'application/octet-stream'
      });

      addToast(`Tesoro "${file.name}" blindado y guardado`);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al subir archivo:', err);
      addToast(err.message || 'Error al cifrar y subir el archivo', 'error');
    } finally {
      setActionLoading(false);
      setUploadProgress((prev) => ({ ...prev, isOpen: false }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileUpload(file);
  };

  // 3. DESCARGAR Y DESCIFRAR TESORO
  const handleDownloadTesoro = async (tesoro) => {
    setActionLoading(true);
    try {
      addToast(`Descifrando "${tesoro.plainName}" en RAM...`, 'info');

      let buffer;
      let fileIv;

      if (tesoro.drive_file_id.startsWith('gdrive-mock-')) {
        const driveRecord = await api.downloadDriveMock(tesoro.drive_file_id);
        buffer = driveRecord.encryptedBuffer || driveRecord;
        fileIv = driveRecord.fileIv || tesoro.iv;
      } else {
        if (!isGoogleConnected || !googleAccessToken) {
          addToast('Debes conectar tu Google Drive para descargar este tesoro', 'error');
          return;
        }
        addToast(`Descargando blob cifrado desde Google Drive...`, 'info');
        const driveRecord = await downloadEncryptedFileFromDrive({
          driveFileId: tesoro.drive_file_id,
          accessToken: googleAccessToken,
          fallbackIv: tesoro.iv,
        });
        buffer = driveRecord.encryptedBuffer;
        fileIv = driveRecord.fileIv || tesoro.iv;
      }


      const decryptedArrayBuffer = await decryptFileBlob(buffer, fileIv);

      const blob = new Blob([decryptedArrayBuffer], { type: tesoro.tipo_mime || 'application/octet-stream' });
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
      console.error('Error al descargar/descifrar tesoro:', err);
      addToast('No se pudo descifrar el archivo.', 'error');
    } finally {
      setActionLoading(false);
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
      const { nombre_cifrado, iv } = await encryptName(inputValue.trim());

      if (activeItem.type === 'baul') {
        await api.updateBaul(activeItem.item.id, { nombre_cifrado, iv });
        addToast(`Baúl renombrado a "${inputValue.trim()}"`);
      } else {
        await api.updateTesoro(activeItem.item.id, { nombre_cifrado, iv });
        addToast(`Tesoro renombrado a "${inputValue.trim()}"`);
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

        {/* Botones de Acción en la misma sección de Raíz del Baúl */}
        <div className="toolbar-actions">
          <button
            type="button"
            className="btn-action btn-new-folder"
            onClick={handleOpenCreateFolder}
            disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
            title="Crear un nuevo baúl virtual"
          >
            <span>📁+</span>
            <span>Nuevo Baúl</span>
          </button>

          <button
            type="button"
            className="btn-action btn-upload"
            onClick={handleTriggerUpload}
            disabled={actionLoading || uploadProgress.isOpen || deletingProgress.isDeleting}
            title="Subir y cifrar un archivo con AES-GCM 256 bits"
          >
            <span>⬆️</span>
            <span>Subir Tesoro</span>
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
            <p>Descifrando metadatos en tu navegador...</p>
          </div>
        ) : baules.length === 0 && tesoros.length === 0 ? (
          <div className="vault-empty-state">
            <div className="empty-pixel-art-container">
              <img
                src={baulPixelArt}
                alt="Baúl Mágico"
                className="empty-pixel-art-img"
              />
              <div className="empty-pixel-glow"></div>
            </div>
            <p className="empty-pixel-hint">Tu baúl está vacío y protegido con Conocimiento Cero</p>
          </div>
        ) : (
          <div className="explorer-grid">
            {/* 1. Carpetas / Baúles (Draggable y Drop Target) */}
            {baules.map((baul) => {
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

                  <div className="card-icon folder-icon">📁</div>

                  <span className="card-title" title={baul.plainName}>
                    {baul.plainName}
                  </span>
                </div>
              );
            })}

            {/* 2. Archivos / Tesoros (Draggable) */}
            {tesoros.map((tesoro) => {
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
                          <span>Descargar descifrado</span>
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
                          <span>Mover a...</span>
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

                  <div className={`card-icon file-icon ${category.badgeClass}-icon`}>
                    {category.icon}
                  </div>

                  <span className="card-title" title={tesoro.plainName}>
                    {tesoro.plainName}
                  </span>
                </div>
              );
            })}
          </div>
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
