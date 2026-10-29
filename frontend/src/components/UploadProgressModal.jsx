import React from 'react';

/**
 * Modal y Overlay bloqueante durante el proceso de Cifrado y Subida de Tesoros.
 * Previene condiciones de carrera, bloquea clics accidentales y ofrece
 * visibilidad del proceso Zero-Knowledge en tiempo real.
 */
export default function UploadProgressModal({
  isOpen,
  fileName,
  fileSize,
  stage = 'encrypting', // 'encrypting' | 'uploading' | 'saving'
  statusMessage
}) {
  if (!isOpen) return null;

  const stageConfig = {
    encrypting: {
      step: 1,
      total: 3,
      title: 'Cifrado en Cliente (Zero-Knowledge)',
      defaultMsg: 'Cifrando bytes con AES-GCM (256 bits) en memoria RAM...',
      icon: '🛡️',
      colorClass: 'stage-crypto',
      progressPercent: '33%'
    },
    uploading: {
      step: 2,
      total: 3,
      title: 'Subida a la Nube',
      defaultMsg: 'Enviando blob cifrado (.enc) a Google Drive...',
      icon: '☁️',
      colorClass: 'stage-upload',
      progressPercent: '66%'
    },
    saving: {
      step: 3,
      total: 3,
      title: 'Sincronización Segura',
      defaultMsg: 'Registrando metadatos blindados en el Baúl...',
      icon: '✨',
      colorClass: 'stage-save',
      progressPercent: '100%'
    }
  };

  const current = stageConfig[stage] || stageConfig.encrypting;

  return (
    <div className="modal-backdrop upload-overlay-backdrop" role="dialog" aria-modal="true">
      <div className="modal-box upload-progress-box" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado con Icono Pulsante y Estado de Paso */}
        <div className="upload-header">
          <div className={`upload-pulse-orb ${current.colorClass}`}>
            <span className="upload-orb-icon">{current.icon}</span>
          </div>
          <div className="upload-title-area">
            <h3>{current.title}</h3>
            <span className="upload-step-badge">Paso {current.step} de {current.total}</span>
          </div>
        </div>

        {/* Tarjeta del archivo procesado */}
        <div className="upload-file-card">
          <span className="upload-file-icon">📄</span>
          <div className="upload-file-info">
            <strong className="upload-file-name" title={fileName}>
              {fileName || 'Archivo en proceso'}
            </strong>
            {fileSize && <span className="upload-file-size">{fileSize}</span>}
          </div>
        </div>

        {/* Estado en vivo con spinner sutil */}
        <div className="upload-status-box">
          <div className="upload-spinner-ring"></div>
          <p className="upload-status-text">
            {statusMessage || current.defaultMsg}
          </p>
        </div>

        {/* Barra de progreso visual con transición */}
        <div className="upload-progress-bar-container">
          <div
            className={`upload-progress-bar-fill ${stage}`}
            style={{ width: current.progressPercent }}
          ></div>
        </div>

        {/* Recordatorio de Seguridad Zero-Knowledge */}
        <div className="upload-security-hint">
          <span>🔒</span>
          <p>
            <strong>Zero-Knowledge Activo:</strong> Tu archivo se cifra de forma local e inviolable en tu navegador antes de viajar. Por favor, mantén esta ventana abierta.
          </p>
        </div>
      </div>
    </div>
  );
}
