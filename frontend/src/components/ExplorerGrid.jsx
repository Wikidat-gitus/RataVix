import React from 'react';
import { getFileCategory } from '../utils/fileTypes';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Cuadrícula de Escritorio (ExplorerGrid) para RataVix:
 * Renderiza los mosaicos estilo Windows Explorer (o Pixel Art Retro)
 * para carpetas y archivos con soporte nativo de Drag & Drop y menú kebab (⋮).
 * 
 * Principio SOLID: Responsabilidad Única (S)
 */
export default function ExplorerGrid({
  paginatedBaules,
  paginatedTesoros,
  isPixelMode,
  currentPage,
  slideDirection,
  draggedItem,
  dragOverTargetId,
  openMenuId,
  setOpenMenuId,
  isEncryptedMode,
  onOpenBaul,
  onOpenRename,
  onOpenMove,
  onDeleteItem,
  onDownloadTesoro,
  onMigrateTesoro,
  onPreviewTesoro,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  return (
    <div className={`explorer-grid-wrapper ${isPixelMode ? 'pixel-row-wrapper' : ''}`}>
      <div
        key={isPixelMode ? `pixel-page-${currentPage}` : 'normal-grid'}
        className={`explorer-grid ${isPixelMode ? `pixel-single-row slide-${slideDirection}` : ''}`}
      >
        {/* 1. Carpetas / Baúles (Draggable y Drop Target) */}
        {paginatedBaules.map((baul) => {
          const isDragging = draggedItem?.type === 'baul' && draggedItem.item.id === baul.id;
          const isDropHover = dragOverTargetId === baul.id;

          return (
            <div
              key={baul.id}
              className={`explorer-card folder-card ${openMenuId === `baul-${baul.id}` ? 'menu-open' : ''} ${isDragging ? 'is-dragging' : ''} ${isDropHover ? 'drop-hover' : ''}`}
              draggable={true}
              onDragStart={(e) => onDragStart(e, 'baul', baul)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOver(e, baul.id)}
              onDragLeave={(e) => onDragLeave(e, baul.id)}
              onDrop={(e) => onDrop(e, baul.id, baul.plainName)}
              onDoubleClick={() => onOpenBaul(baul)}
              onClick={() => onOpenBaul(baul)}
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
                        onOpenBaul(baul);
                      }}
                    >
                      <span className="dropdown-icon">📂</span>
                      <span>Abrir carpeta</span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setOpenMenuId(null);
                        onOpenRename('baul', baul);
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
                        onOpenMove('baul', baul);
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
                        onDeleteItem('baul', baul);
                      }}
                    >
                      <span className="dropdown-icon">🗑️</span>
                      <span>Eliminar carpeta</span>
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
              className={`explorer-card file-card ${openMenuId === `tesoro-${tesoro.id}` ? 'menu-open' : ''} ${isDragging ? 'is-dragging' : ''}`}
              draggable={true}
              onDragStart={(e) => onDragStart(e, 'tesoro', tesoro)}
              onDragEnd={onDragEnd}
              onClick={() => onPreviewTesoro(tesoro)}
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
                        onPreviewTesoro(tesoro);
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
                        onDownloadTesoro(tesoro);
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
                        onOpenRename('tesoro', tesoro);
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
                        onOpenMove('tesoro', tesoro);
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
                        onMigrateTesoro(tesoro, isEncryptedMode ? 'libre' : 'secreto');
                      }}
                      title={isEncryptedMode ? 'Mover a Raíz Libre' : 'Blindar con Conocimiento Cero y mover a Raíz Secreta'}
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
                        onDeleteItem('tesoro', tesoro);
                      }}
                    >
                      <span className="dropdown-icon">🗑️</span>
                      <span>Eliminar archivo</span>
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
    </div>
  );
}
