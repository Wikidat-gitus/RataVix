import React from 'react';

/**
 * Contenedor y renderizador de Notificaciones Toast Flotantes.
 * Principio SOLID: Responsabilidad Única (S)
 */
export default function ToastContainer({ toasts, onRemoveToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
          onClick={() => onRemoveToast(toast.id)}
        >
          <span className="toast-icon">
            {toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : toast.type === 'warning' ? '⚠️' : '✅'}
          </span>
          <span className="toast-text">{toast.text}</span>
          <button
            type="button"
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveToast(toast.id);
            }}
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

