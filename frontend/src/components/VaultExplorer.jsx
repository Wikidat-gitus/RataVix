import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { mockApi } from '../services/mockApi';

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
  const [statusMessage, setStatusMessage] = useState(null);

  // Modales
  const [modalMode, setModalMode] = useState(null); // 'createFolder' | 'rename' | 'move'
  const [activeItem, setActiveItem] = useState(null); // { type: 'baul' | 'tesoro', item: obj, currentName: string }
  const [inputValue, setInputValue] = useState('');
  const [selectedTargetBaulId, setSelectedTargetBaulId] = useState(null);

  const fileInputRef = useRef(null);

  // Mostrar mensaje temporal
  const showFeedback = (text, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4000);
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
      showFeedback('Error al cargar elementos del baúl', true);
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
      // Cifrado Zero-Knowledge del nombre
      const { nombre_cifrado, iv } = await encryptName(inputValue.trim());
      await mockApi.createBaul({
        nombre_cifrado,
        iv,
        baul_padre_id: currentBaulId
      });
      showFeedback(`Baúl "${inputValue.trim()}" creado y cifrado con éxito`);
      setModalMode(null);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al crear baúl:', err);
      showFeedback('No se pudo crear el baúl', true);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. SUBIR TESORO (Archivo)
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
      showFeedback(`Cifrando archivo "${file.name}" con AES-GCM...`);

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
        iv: nameIv, // Metadato usa el IV del nombre; para el archivo usamos el suyo
        tamano_bytes: file.size,
        tipo_mime: file.type || 'application/octet-stream'
      });

      // Guardamos el fileIv en un mapa o junto al drive file para poder restaurarlo intacto
      // (En mockDriveStorage o metadata complementaria)
      window[`iv_file_${drive_file_id}`] = fileIv;

      showFeedback(`Tesoro "${file.name}" blindado y guardado correctamente`);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al subir archivo:', err);
      showFeedback('Error al cifrar y subir el archivo', true);
    } finally {
      setActionLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  // 3. DESCARGAR Y DESCIFRAR TESORO
  const handleDownloadTesoro = async (tesoro) => {
    setActionLoading(true);
    try {
      showFeedback(`Descargando y descifrando "${tesoro.plainName}"...`);

      // Obtener buffer cifrado desde Google Drive
      const encryptedBuffer = await mockApi.downloadDriveMock(tesoro.drive_file_id);

      // Obtener el IV del binario (o usar el del registro)
      const fileIv = window[`iv_file_${tesoro.drive_file_id}`] || tesoro.iv;

      // Descifrado en RAM
      const decryptedArrayBuffer = await decryptFileBlob(encryptedBuffer, fileIv);

      // Disparar descarga en navegador
      const blob = new Blob([decryptedArrayBuffer], { type: tesoro.tipo_mime });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = tesoro.plainName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      showFeedback(`"${tesoro.plainName}" descifrado y descargado intacto.`);
    } catch (err) {
      console.error('Error al descargar/descifrar tesoro:', err);
      showFeedback('No se pudo descifrar el archivo.', true);
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
        showFeedback(`Baúl renombrado a "${inputValue.trim()}"`);
      } else {
        await mockApi.updateTesoro(activeItem.item.id, { nombre_cifrado, iv });
        showFeedback(`Tesoro renombrado a "${inputValue.trim()}"`);
      }

      setModalMode(null);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al renombrar:', err);
      showFeedback('Error al renombrar el elemento', true);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. MOVER (Baúl o Tesoro)
  const handleOpenMove = (type, item) => {
    setActiveItem({ type, item, currentName: item.plainName });
    // Por defecto seleccionar la raíz
    setSelectedTargetBaulId(null);
    setModalMode('move');
  };

  const handleConfirmMove = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    // Validación: No moverse a sí mismo
    if (activeItem.type === 'baul' && selectedTargetBaulId === activeItem.item.id) {
      showFeedback('No puedes mover una carpeta dentro de sí misma', true);
      return;
    }

    setActionLoading(true);
    try {
      if (activeItem.type === 'baul') {
        await mockApi.updateBaul(activeItem.item.id, { baul_padre_id: selectedTargetBaulId });
        showFeedback(`Baúl movido exitosamente`);
      } else {
        await mockApi.updateTesoro(activeItem.item.id, { baul_id: selectedTargetBaulId });
        showFeedback(`Tesoro movido exitosamente`);
      }

      setModalMode(null);
      await loadVaultContent();
    } catch (err) {
      console.error('Error al mover:', err);
      showFeedback('Error al mover el elemento', true);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. ELIMINAR (Baúl o Tesoro)
  const handleDeleteItem = async (type, item) => {
    const confirmText = type === 'baul'
      ? `¿Eliminar el baúl "${item.plainName}" y todo su contenido?`
      : `¿Eliminar el tesoro "${item.plainName}"?`;

    if (!window.confirm(confirmText)) return;

    setActionLoading(true);
    try {
      if (type === 'baul') {
        await mockApi.deleteBaul(item.id);
        showFeedback(`Baúl "${item.plainName}" eliminado`);
      } else {
        await mockApi.deleteTesoro(item.id);
        showFeedback(`Tesoro "${item.plainName}" eliminado`);
      }
      await loadVaultContent();
    } catch (err) {
      console.error('Error al eliminar:', err);
      showFeedback('No se pudo eliminar el elemento', true);
    } finally {
      setActionLoading(false);
    }
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
      {/* Barra de Acciones y Seguridad */}
      <div className="explorer-topbar">
        <div className="vault-security-indicator">
          <span className="unlocked-pulse"></span>
          <div>
            <strong>Baúl Abierto</strong>
            <span>Clave activa en RAM</span>
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

      {/* Banner de Feedback / Notificaciones */}
      {statusMessage && (
        <div className={`status-banner ${statusMessage.isError ? 'error' : 'success'}`}>
          {statusMessage.text}
        </div>
      )}

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
            {/* Carpetas / Baúles */}
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
                    title="Entrar"
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

            {/* Archivos / Tesoros */}
            {tesoros.map((tesoro) => (
              <div key={tesoro.id} className="explorer-card file-card">
                <div className="card-main" onClick={() => handleDownloadTesoro(tesoro)}>
                  <div className="card-icon file-icon">🔒</div>
                  <div className="card-details">
                    <strong className="card-title" title={tesoro.plainName}>
                      {tesoro.plainName}
                    </strong>
                    <span className="card-meta">
                      {formatBytes(tesoro.tamano_bytes)} • Cifrado AES-GCM
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="item-btn download-action"
                    title="Descargar y Descifrar"
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
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Crear o Renombrar */}
      {(modalMode === 'createFolder' || modalMode === 'rename') && (
        <div className="modal-backdrop">
          <div className="modal-box">
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
        <div className="modal-backdrop">
          <div className="modal-box">
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
                  .filter((b) => b.id !== activeItem.item.id) // Evitar mover carpeta dentro de sí misma
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
    </div>
  );
}
