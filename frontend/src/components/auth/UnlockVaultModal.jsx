import '../modals/VaultModals.css';
import React, { useState } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { useGoogleAuth } from '../../context/GoogleAuthContext';
import { api } from '../../services/api';

export default function UnlockVaultModal({
  onLogout,
  onForgotPassword,
  onBackToFreeMode,
  isLocalMock,
  showDevTools = false,
}) {
  const { unlockVault, unlocking, error } = useCrypto();
  const { isGoogleConnected, googleUser, backendUser } = useGoogleAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const ensureBackendSession = async () => {
    if (!api.getToken()) {
      try {
        await api.loginGoogle({
          email: googleUser?.email || 'usuario.demo@baulmagico.local',
          code: 'session_init',
        });
      } catch (err) {
        console.warn('Sincronización previa de sesión:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    await ensureBackendSession();
    await unlockVault(password, backendUser);
  };

  const handleQuickKey = async (demoKey) => {
    setPassword(demoKey);
    await ensureBackendSession();
    await unlockVault(demoKey, backendUser);
  };

  return (
    <div className="unlock-container">
      <div className="unlock-card compact-unlock-card">
        {/* Cabecera Compacta */}
        <div className="unlock-header">
          <div className="unlock-mini-icon">🔒</div>
          <h2>Desbloquear Modo Secreto</h2>
          <p>
            Introduce tu contraseña maestra para acceder a tus archivos.
          </p>
        </div>

        {/* Formulario Directo */}
        <form onSubmit={handleSubmit} className="unlock-form">
          <div className="password-input-wrapper">
            <input
              id="master-key"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña maestra..."
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

          {error && <div className="unlock-error-banner">⚠️ {error}</div>}

          <button
            type="submit"
            className="btn-unlock-primary"
            disabled={unlocking || !password.trim()}
          >
            {unlocking ? (
              <>
                <span className="spinner-dot"></span>
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>🗝️</span>
                <span>Desbloquear Bóveda</span>
              </>
            )}
          </button>
        </form>

        {/* Acciones Secundarias Limpias en línea */}
        <div className="unlock-footer-links">
          {onBackToFreeMode && (
            <button
              type="button"
              className="btn-link-action"
              onClick={onBackToFreeMode}
              disabled={unlocking}
            >
              ← Volver a Modo Libre
            </button>
          )}

          {onForgotPassword && (
            <button
              type="button"
              className="btn-link-action btn-link-muted-danger"
              onClick={onForgotPassword}
            >
              ¿Olvidaste tu clave?
            </button>
          )}
        </div>

        {/* Acceso rápido de prueba para desarrollo (Solo en Modo Dev / Admin) */}
        {showDevTools && (
          <div className="dev-shortcut-box" style={{ marginTop: '0.25rem', padding: '0.4rem' }}>
            <button
              type="button"
              className="btn-shortcut"
              onClick={() => handleQuickKey('rasputin')}
              disabled={unlocking}
            >
              🪄 Clave de prueba: <code>"rasputin"</code>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
