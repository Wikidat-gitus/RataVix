import React from 'react';

export default function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-box confirm-modal-box" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onCancel}
          title="Cerrar ventana"
        >
          ✕
        </button>
        <div className="confirm-icon-orb">
          <span>{isDanger ? '🗑️' : '❓'}</span>
        </div>

        <h3>{title}</h3>
        <p className="modal-description">{message}</p>

        <div className="modal-buttons">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? 'btn-danger' : 'btn-confirm'}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
