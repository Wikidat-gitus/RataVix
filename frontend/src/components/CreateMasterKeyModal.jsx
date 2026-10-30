import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';

export default function CreateMasterKeyModal({ onLogout, isLocalMock, showDevTools = false }) {
  const { setupInitialKey, unlocking, error } = useCrypto();
  const { isGoogleConnected, googleUser, updateBackendUser } = useGoogleAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    const updatedUser = await setupInitialKey(password, isLocalMock);
    if (updatedUser) {
      updateBackendUser(updatedUser);
    }
  };

  const handleQuickKey = async (demoKey) => {
    setPassword(demoKey);
    setConfirmPassword(demoKey);
    const updatedUser = await setupInitialKey(demoKey, isLocalMock);
    if (updatedUser) {
      updateBackendUser(updatedUser);
    }
  };

  return (
    <div className="unlock-container">
      <div className="unlock-card setup-key-card">
        {/* Encabezado Mágico */}
        <div className="unlock-header">
          <div className="vault-lock-orb setup-orb">
            <span className="lock-icon">🗝️</span>
          </div>
          <span className="auth-step-pill">Paso 2 de 2 • Primer Acceso & Blindaje</span>

          {/* Chip de Identidad Conectada */}
          <div className="account-connected-chip">
            <span className="account-dot"></span>
            <span className="account-email">
              {isGoogleConnected
                ? `☁️ ${googleUser?.email || 'Google Drive Conectado'}`
                : '💾 Modo de Prueba Local'}
            </span>
            {onLogout && (
              <button
                type="button"
                className="account-logout-link"
                onClick={onLogout}
                title="Cerrar sesión y cambiar de cuenta"
              >
                Cerrar sesión
              </button>
            )}
          </div>

          <h2>Crea tu Contraseña Maestra</h2>
          <p>
            Esta frase secreta protegerá todos tus archivos con cifrado <strong>AES-GCM de 256 bits</strong>.
          </p>
        </div>

        {/* Formulario de Creación de Clave */}
        <form onSubmit={handleSubmit} className="unlock-form">
          <div className="form-group">
            <label htmlFor="create-master-key">Nueva Contraseña Maestra (Mínimo 6 caracteres)</label>
            <div className="password-input-wrapper">
              <input
                id="create-master-key"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLocalError(null);
                }}
                placeholder="Elige una contraseña sólida y memorable..."
                autoFocus
                disabled={unlocking}
                className="input-field"
              />
              <button
                type="button"
                className="toggle-vis-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? '👁️' : '🕶️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-master-key">Confirma tu Contraseña Maestra</label>
            <div className="password-input-wrapper">
              <input
                id="confirm-master-key"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setLocalError(null);
                }}
                placeholder="Vuelve a escribir la contraseña..."
                disabled={unlocking}
                className="input-field"
              />
            </div>
          </div>

          {(localError || error) && (
            <div className="unlock-error-banner">⚠️ {localError || error}</div>
          )}

          {/* Advertencia Crítica Zero-Knowledge */}
          <div className="critical-warning-box">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>ADVERTENCIA DE SEGURIDAD CRÍTICA:</strong>
              <p>
                Tu contraseña <em>nunca</em> viaja al servidor ni a Google. No existe botón de <em>"recuperar contraseña"</em>.
                Si la olvidas, la única forma de volver a usar la aplicación será purgar por completo el baúl y empezar de cero.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="btn-unlock-primary btn-setup-primary"
            disabled={unlocking || !password.trim() || !confirmPassword.trim()}
          >
            {unlocking ? (
              <>
                <span className="spinner-dot"></span>
                <span>Blindando y Derivando Clave AES-256...</span>
              </>
            ) : (
              <>
                <span>🛡️</span>
                <span>Blindar y Abrir mi Baúl</span>
              </>
            )}
          </button>
        </form>

        {/* Acceso rápido de prueba para desarrollo (Solo en Modo Dev / Admin) */}
        {showDevTools && (
          <div className="dev-shortcut-box">
            <span className="dev-badge">Modo Desarrollo</span>
            <p>¿Quieres configurar rápidamente para pruebas?</p>
            <button
              type="button"
              className="btn-shortcut"
              onClick={() => handleQuickKey('rasputin')}
              disabled={unlocking}
            >
              🪄 Crear con clave sugerida: <code>"rasputin"</code>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

