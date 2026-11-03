import '../modals/VaultModals.css';
import React, { useState } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { useGoogleAuth } from '../../context/GoogleAuthContext';

export default function ResetVaultModal({ onClose, isLocalMock }) {
  const { resetVaultAndPurge } = useCrypto();
  const { googleAccessToken, backendUser, updateBackendUser } = useGoogleAuth();

  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  const handleConfirmReset = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ELIMINAR') return;

    setIsResetting(true);
    setResetError(null);

    try {
      const res = await resetVaultAndPurge(googleAccessToken, isLocalMock);
      if (res.ok) {
        // Actualizar el estado de usuario: ahora ya no tiene clave maestra configurada
        updateBackendUser({
          ...(backendUser || {}),
          tiene_clave_maestra: false,
          salt_cifrado: null,
          canary_cifrado: null,
          canary_iv: null,
        });
        onClose();
      } else {
        setResetError(res.error || 'Ocurrió un error al purgar la bóveda.');
      }
    } catch (err) {
      setResetError(err.message || 'Error inesperado al purgar.');
    } finally {
      setIsResetting(false);
    }
  };

  const isConfirmed = confirmInput.trim().toUpperCase() === 'ELIMINAR';

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog reset-vault-modal">
        <div className="reset-modal-header">
          <div className="reset-icon-orb">🔥</div>
          <h2>¿Olvidaste tu Contraseña Maestra?</h2>
          <span className="reset-badge-danger">Acción Irreversible</span>
        </div>

        <div className="reset-modal-body">
          <div className="reset-explanation-box">
            <p>
              En la arquitectura de <strong>Cero Conocimiento</strong>, tus archivos se cifran de extremo a extremo.
              Ni nosotros, ni Render, ni Google poseemos tu clave maestra, por lo que <strong>nadie puede recuperar tus datos</strong>.
            </p>
            <p>
              Para poder volver a utilizar tu cuenta y crear una nueva contraseña maestra, es necesario <strong>purgar por completo la bóveda secreta</strong>:
            </p>
            <ul className="reset-consequences-list">
              <li>🗑️ Se eliminarán todas tus carpetas secretas y metadatos en la base de datos.</li>
              <li>☁️ Se purgarán los archivos cifrados (.enc) en tu Google Drive.</li>
              <li>✨ Tu cuenta quedará limpia para configurar una nueva clave maestra inmediatamente.</li>
            </ul>
          </div>

          <div className="reset-confirmation-prompt">
            <label htmlFor="confirm-delete-input">
              Escribe la palabra <strong>ELIMINAR</strong> para autorizar la purga completa:
            </label>
            <input
              id="confirm-delete-input"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Escribe ELIMINAR..."
              autoFocus
              disabled={isResetting}
              className="input-field reset-input-danger"
            />
          </div>

          {resetError && (
            <div className="unlock-error-banner" style={{ marginTop: '1rem' }}>
              ⚠️ {resetError}
            </div>
          )}
        </div>

        <div className="modal-actions reset-modal-actions">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
            disabled={isResetting}
          >
            Cancelar y Recordar Clave
          </button>
          <button
            type="button"
            className="btn-danger-confirm"
            onClick={handleConfirmReset}
            disabled={!isConfirmed || isResetting}
          >
            {isResetting ? (
              <>
                <span className="spinner-dot"></span>
                <span>Purgando archivos y reseteando...</span>
              </>
            ) : (
              '🔥 Purgar Todo y Crear Nueva Clave'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

