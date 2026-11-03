import React from 'react';

/**
 * Modales de Acción para Carpetas y Archivos:
 * - Crear Carpeta (Modo Libre o Secreto)
 * - Renombrar Carpeta o Archivo
 * - Mover a otra carpeta
 * 
 * Principio SOLID: Responsabilidad Única (S) e Inversión de Dependencias (D)
 */
export default function FolderActionModals({
  modalMode, // 'createFolder' | 'rename' | 'move' | null
  activeItem,
  isEncryptedMode,
  inputValue,
  setInputValue,
  actionLoading,
  selectedTargetBaulId,
  setSelectedTargetBaulId,
  allBaulesList,
  loadingMoveTargets,
  onClose,
  onConfirmCreateFolder,
  onConfirmRename,
  onConfirmMove,
}) {
  if (!modalMode) return null;

  return (
    <>
      {/* MODAL 1: Crear o Renombrar */}
      {(modalMode === 'createFolder' || modalMode === 'rename') && (
        <div className="modal-backdrop">
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              disabled={actionLoading}
              title="Cerrar ventana"
            >
              ✕
            </button>
            <h3>
              {modalMode === 'createFolder'
                ? (isEncryptedMode ? '📁 Crear Nueva Carpeta Secreta' : '📁 Crear Nueva Carpeta')
                : `✏️ Renombrar ${activeItem?.type === 'baul' ? 'Carpeta' : 'Archivo'}`}
            </h3>
            <p className="modal-description">
              {isEncryptedMode
                ? 'El nombre se cifrará con AES-GCM (256 bits) antes de guardarse en el sistema.'
                : 'El nombre se guardará directamente en tu Google Drive.'}
            </p>

            <form
              onSubmit={
                modalMode === 'createFolder'
                  ? onConfirmCreateFolder
                  : onConfirmRename
              }
            >
              <input
                type="text"
                className="input-field"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isEncryptedMode ? "Nombre de la carpeta o archivo secreto..." : "Nombre de la carpeta o archivo..."}
                autoFocus
                required
              />

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={actionLoading || !inputValue.trim()}
                >
                  {actionLoading ? 'Guardando...' : (isEncryptedMode ? 'Guardar Cifrado' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Mover elemento */}
      {modalMode === 'move' && activeItem && (
        <div className="modal-backdrop">
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              disabled={actionLoading}
              title="Cerrar ventana"
            >
              ✕
            </button>
            <h3>📦 Mover "{activeItem.currentName}"</h3>
            <p className="modal-description">
              Selecciona la carpeta de destino donde deseas ubicar este elemento:
            </p>

            <form onSubmit={onConfirmMove}>
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
                  onClick={onClose}
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
    </>
  );
}

