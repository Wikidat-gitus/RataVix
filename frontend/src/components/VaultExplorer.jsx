import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { mockApi } from '../services/mockApi';
import { getFileCategory } from '../utils/fileTypes';
import TreasureViewerModal from './TreasureViewerModal';
import ConfirmModal from './ConfirmModal';

export default function VaultExplorer() {
  const { lockVault, encryptName, decryptName, encryptFileBlob, decryptFileBlob } = useCrypto();

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

  // Modales
  const [modalMode, setModalMode] = useState(null); // 'createFolder' | 'rename' | 'move'
  const [activeItem, setActiveItem] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedTargetBaulId, setSelectedTargetBaulId] = useState(null);

  // Visor de Tesoros
  const [viewerTesoro, setViewerTesoro] = useState(null);

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

  // Función para disparar notificaciones Toast flotantes y suaves
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

  /**
   * Carga y descifra los baúles y tesoros del nivel actual
   */
  const loadVaultContent = useCallback(async () => {
    setLoading(true);
    try {
      const [rawBaules, rawTesoros, allAvailable] = await Promise.all([
        mockApi.getBaules(currentBaulId),
        mockApi.getTesoros(currentBaulId),
        mockApi.getAllBaules()
      ]);

      // Descifrar nombres de baúles en el cliente
      const decryptedBaules = await Promise.all(
        rawBaules.map(async (b) => {
          const plainName = await decryptName(b.nombre_cifrado, b.iv);
          return { ...b, plainName };
        })
      );

      // Descifrar nombres de tesoros en el cliente
      const decryptedTesoros = await Promise.all(
        rawTesoros.map(async (t) => {
          const plainName = await decryptName(t.nombre_cifrado, t.iv);
          return { ...t, plainName };
        })
      );

      // Descifrar lista completa para selectores de mover
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
      await mockApi.createBaul({
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

  // 2. SUBIR TESORO (Archivo con detección automática de tipo)
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading(true);
    try {
      addToast(`Cifrando "${file.name}" con AES-GCM 256 bits...`, 'info');

      // 1. Cifrar binario
      const { encryptedBuffer, iv: fileIv } = await encryptFileBlob(file);

      // 2. Cifrar nombre del archivo
      const { nombre_cifrado, iv: nameIv } = await encryptName(file.name);

      // 3. Simular subida directa a Google Drive
      const { drive_file_id } = await mockApi.uploadDriveMock(encryptedBuffer);

      // 4. Guardar metadatos en el backend
      await mockApi.createTesoro({
        baul_id: currentBaulId,
        drive_file_id,
        nombre_cifrado,
        iv: nameIv,
        tamano_bytes: file.size,
        tipo_mime: file.type || 'application/octet-stream'
      });

      // Guardamos la referencia del IV del binario para descifrado fiel
      window[`iv_file_${drive_file_id}`] = fileIv;

      addToast(`Tesoro "${file.name}" blindado y guardado`);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al subir archivo:', err);
      addToast('Error al cifrar y subir el archivo', 'error');
    } finally {
      setActionLoading(false);
      e.target.value = '';
    }
  };

  // 3. DESCARGAR Y DESCIFRAR TESORO
  const handleDownloadTesoro = async (tesoro) => {
    setActionLoading(true);
    try {
      addToast(`Descifrando "${tesoro.plainName}" en RAM...`, 'info');

      const encryptedBuffer = await mockApi.downloadDriveMock(tesoro.drive_file_id);
      const fileIv = window[`iv_file_${tesoro.drive_file_id}`] || tesoro.iv;
      const decryptedArrayBuffer = await decryptFileBlob(encryptedBuffer, fileIv);

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
        await mockApi.updateBaul(activeItem.item.id, { nombre_cifrado, iv });
        addToast(`Baúl renombrado a "${inputValue.trim()}"`);
      } else {
        await mockApi.updateTesoro(activeItem.item.id, { nombre_cifrado, iv });
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

  // 5. MOVER (Baúl o Tesoro)
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
        await mockApi.updateBaul(activeItem.item.id, { baul_padre_id: selectedTargetBaulId });
        addToast(`Baúl movido exitosamente`);
      } else {
        await mockApi.updateTesoro(activeItem.item.id, { baul_id: selectedTargetBaulId });
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

  // 6. ELIMINAR con ConfirmModal moderno (reemplaza window.confirm)
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
        try {
          if (isFolder) {
            await mockApi.deleteBaul(item.id);
            addToast(`Baúl "${item.plainName}" eliminado`);
          } else {
            await mockApi.deleteTesoro(item.id);
            addToast(`Tesoro "${item.plainName}" eliminado`);
          }
          await loadVaultContent();
        } catch (err) {
          console.error('Error al eliminar:', err);
          addToast('No se pudo eliminar el elemento', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Formateador de bytes
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="vault-explorer">
      {/* Barra Superior de Acciones y Seguridad */}
      <div className="explorer-topbar">
        <div className="vault-security-indicator">
          <span className="unlocked-pulse"></span>
          <div>
            <strong>Baúl Abierto</strong>
            <span>Cifrado y descifrado en RAM</span>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="btn-action btn-new-folder"
            onClick={handleOpenCreateFolder}
            disabled={actionLoading}
          >
            <span>📁+</span>
            <span>Nuevo Baúl</span>
          </button>

          <button
            type="button"
            className="btn-action btn-upload"
            onClick={handleTriggerUpload}
            disabled={actionLoading}
          >
            <span>⬆️</span>
            <span>Subir Tesoro</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelected}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn-action btn-lock"
            onClick={lockVault}
            title="Destruir clave en RAM y cerrar baúl"
          >
            <span>🔒</span>
            <span>Cerrar Baúl</span>
          </button>
        </div>
      </div>

      {/* Migas de Pan (Breadcrumbs) */}
      <nav className="breadcrumbs-bar">
        <span className="breadcrumbs-icon">🧭</span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id || 'root'}>
            {idx > 0 && <span className="breadcrumb-separator">/</span>}
            <button
              type="button"
              className={`breadcrumb-link ${idx === breadcrumbs.length - 1 ? 'current' : ''}`}
              onClick={() => handleNavigateBreadcrumb(idx)}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* Contenido: Listado de Baúles y Tesoros */}
      <div className="explorer-content">
        {loading ? (
          <div className="vault-loading-state">
            <span className="spinner-dot"></span>
            <p>Descifrando metadatos en tu navegador...</p>
          </div>
        ) : baules.length === 0 && tesoros.length === 0 ? (
          <div className="vault-empty-state">
            <div className="empty-icon">✨</div>
            <h3>Este baúl está esperando tus tesoros</h3>
            <p>Crea una subcarpeta con <strong>"Nuevo Baúl"</strong> o añade tu primer archivo protegido con <strong>"Subir Tesoro"</strong>.</p>
            <div className="empty-actions">
              <button className="btn-action btn-new-folder" onClick={handleOpenCreateFolder}>📁 Crear Baúl</button>
              <button className="btn-action btn-upload" onClick={handleTriggerUpload}>⬆️ Subir Archivo</button>
            </div>
          </div>
        ) : (
          <div className="explorer-grid">
            {/* 1. Carpetas / Baúles */}
            {baules.map((baul) => (
              <div
                key={baul.id}
                className="explorer-card folder-card"
                onDoubleClick={() => handleOpenBaul(baul)}
              >
                <div className="card-main" onClick={() => handleOpenBaul(baul)}>
                  <div className="card-icon folder-icon">📁</div>
                  <div className="card-details">
                    <strong className="card-title" title={baul.plainName}>
                      {baul.plainName}
                    </strong>
                    <span className="card-meta">Baúl virtual</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="item-btn"
                    title="Entrar a esta carpeta"
                    onClick={() => handleOpenBaul(baul)}
                  >
                    📂
                  </button>
                  <button
                    className="item-btn"
                    title="Renombrar"
                    onClick={() => handleOpenRename('baul', baul)}
                  >
                    ✏️
                  </button>
                  <button
                    className="item-btn"
                    title="Mover"
                    onClick={() => handleOpenMove('baul', baul)}
                  >
                    📦
                  </button>
                  <button
                    className="item-btn delete-btn"
                    title="Eliminar"
                    onClick={() => handleDeleteItem('baul', baul)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {/* 2. Archivos / Tesoros con Reconocimiento Automático de Tipo */}
            {tesoros.map((tesoro) => {
              const category = getFileCategory(tesoro.plainName, tesoro.tipo_mime);

              return (
                <div key={tesoro.id} className="explorer-card file-card">
                  {/* Clic principal abre el visor en el navegador */}
                  <div className="card-main" onClick={() => setViewerTesoro(tesoro)}>
                    <div className={`card-icon file-icon ${category.badgeClass}-icon`}>
                      {category.icon}
                    </div>
                    <div className="card-details">
                      <strong className="card-title" title={tesoro.plainName}>
                        {tesoro.plainName}
                      </strong>
                      <div className="card-meta-line">
                        <span className={`file-badge ${category.badgeClass}`}>
                          {category.label}
                        </span>
                        <span className="file-size-text">
                          {formatBytes(tesoro.tamano_bytes)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    {/* Botón Ver / Abrir en Navegador */}
                    <button
                      className="item-btn preview-action"
                      title="Abrir y ver en navegador"
                      onClick={() => setViewerTesoro(tesoro)}
                    >
                      👁️
                    </button>
                    {/* Botón Descargar */}
                    <button
                      className="item-btn download-action"
                      title="Descargar copia descifrada"
                      onClick={() => handleDownloadTesoro(tesoro)}
                    >
                      ⬇️
                    </button>
                    <button
                      className="item-btn"
                      title="Renombrar"
                      onClick={() => handleOpenRename('tesoro', tesoro)}
                    >
                      ✏️
                    </button>
                    <button
                      className="item-btn"
                      title="Mover"
                      onClick={() => handleOpenMove('tesoro', tesoro)}
                    >
                      📦
                    </button>
                    <button
                      className="item-btn delete-btn"
                      title="Eliminar"
                      onClick={() => handleDeleteItem('tesoro', tesoro)}
                    >
                      🗑️
                    </button>
                  </div>
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

      {/* MODAL 3: Visor de Tesoros en Vivo (Abrir y Ver en Navegador) */}
      {viewerTesoro && (
        <TreasureViewerModal
          tesoro={viewerTesoro}
          onClose={() => setViewerTesoro(null)}
          onDownload={handleDownloadTesoro}
        />
      )}

      {/* MODAL 4: Confirmación Suave y Flotante (Reemplazo de window.confirm) */}
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
