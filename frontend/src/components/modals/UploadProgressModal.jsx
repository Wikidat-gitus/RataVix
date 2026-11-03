import './UploadProgressModal.css';
import React from 'react';

/**
 * Modal y Overlay bloqueante con Barra de Progreso Dinámica estilo Gamer/HUD.
 * Informa en tiempo real el porcentaje (0-100%), velocidad en vivo (MB/s),
 * bytes transferidos y tiempo estimado (ETA) durante el cifrado y subida a la nube.
 */
export default function UploadProgressModal({
  isOpen,
  fileName,
  fileSize,
  stage = 'encrypting', // 'encrypting' | 'uploading' | 'saving'
  statusMessage,
  percent = null,
  bytesTransferred = null,
  speed = null,
  eta = null,
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
      fallbackPercent: 30,
    },
    uploading: {
      step: 2,
      total: 3,
      title: 'Transmisión Segura a Google Drive',
      defaultMsg: 'Enviando bytes a la nube...',
      icon: '☁️',
      colorClass: 'stage-upload',
      fallbackPercent: 65,
    },
    saving: {
      step: 3,
      total: 3,
      title: 'Sincronización en RataVix',
      defaultMsg: 'Registrando metadatos blindados en base de datos...',
      icon: '✨',
      colorClass: 'stage-save',
      fallbackPercent: 100,
    },
  };

  const current = stageConfig[stage] || stageConfig.encrypting;

  // Determinar el porcentaje efectivo
  let effectivePercent = current.fallbackPercent;
  if (percent !== null && percent !== undefined) {
    effectivePercent = Math.max(0, Math.min(100, percent));
  }

  return (
    <div className="modal-backdrop upload-overlay-backdrop" role="dialog" aria-modal="true">
      <div className="modal-box upload-progress-box upload-hud-box" onClick={(e) => e.stopPropagation()}>
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

        {/* Tarjeta del archivo en proceso */}
        <div className="upload-file-card">
          <span className="upload-file-icon">📄</span>
          <div className="upload-file-info">
            <strong className="upload-file-name" title={fileName}>
              {fileName || 'Archivo en proceso'}
            </strong>
            {fileSize && <span className="upload-file-size">{fileSize}</span>}
          </div>
        </div>

        {/* Display Central de Porcentaje Estilo HUD Gamer */}
        <div className="upload-hud-display">
          <div className="upload-percent-counter">
            <span className="upload-percent-num">{effectivePercent}</span>
            <span className="upload-percent-sym">%</span>
          </div>
          <p className="upload-status-text">
            {statusMessage || current.defaultMsg}
          </p>
        </div>

        {/* Barra de Progreso Dinámica con Resplandor de Neón */}
        <div className="upload-gamer-bar-container">
          <div
            className={`upload-gamer-bar-fill ${stage}`}
            style={{ width: `${effectivePercent}%` }}
          >
            <div className="gamer-bar-glow-beam"></div>
          </div>
        </div>

        {/* Panel de Telemetría en Vivo (Velocidad, Transferencia y ETA) */}
        {(speed || bytesTransferred || eta) && (
          <div className="upload-telemetry-hud">
            {speed && (
              <div className="telemetry-pill">
                <span className="telemetry-label">⚡ Velocidad</span>
                <strong className="telemetry-value">{speed}</strong>
              </div>
            )}
            {bytesTransferred && (
              <div className="telemetry-pill">
                <span className="telemetry-label">📦 Transferido</span>
                <strong className="telemetry-value">{bytesTransferred}</strong>
              </div>
            )}
            {eta && (
              <div className="telemetry-pill">
                <span className="telemetry-label">⏱️ Restante</span>
                <strong className="telemetry-value">{eta}</strong>
              </div>
            )}
          </div>
        )}

        {/* Recordatorio de Seguridad Zero-Knowledge */}
        <div className="upload-security-hint">
          <span>🔒</span>
          <p>
            <strong>Cero Conocimiento:</strong> El archivo se procesa en tu navegador. Mantén esta pestaña activa hasta finalizar.
          </p>
        </div>
      </div>
    </div>
  );
}
