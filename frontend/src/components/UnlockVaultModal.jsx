import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { api } from '../services/api';

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
      <div className="unlock-card">
        {/* Cabecera Limpia */}
        <div className="unlock-header">
          <div className="auth-gate-icon">🔒</div>
          <h2>Desbloquear Modo Secreto</h2>
          <p>
            Ingresa tu contraseña maestra para acceder a tus archivos cifrados.
          </p>
        </div>

        {/* Formulario de Clave */}
        <form onSubmit={handleSubmit} className="unlock-form">
          <div className="form-group">
            <label htmlFor="master-key">Clave Maestra del Baúl</label>
            <div className="password-input-wrapper">
              <input
                id="master-key"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Escribe tu frase o clave secreta..."
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

          {error && <div className="unlock-error-banner">⚠️ {error}</div>}

          <button
            type="submit"
            className="btn-unlock-primary"
            disabled={unlocking || !password.trim()}
          >
            {unlocking ? (
              <>
                <span className="spinner-dot"></span>
                <span>Verificando y Derivando Clave AES-256...</span>
              </>
            ) : (
              <>
                <span>🗝️</span>
                <span>Desbloquear Baúl</span>
              </>
            )}
          </button>

          {onBackToFreeMode && (
            <button
              type="button"
              className="btn-back-free-mode"
              onClick={onBackToFreeMode}
              disabled={unlocking}
            >
              ← Volver a Modo Libre (Sin Clave)
            </button>
          )}
        </form>

        {/* Enlace para restablecimiento de emergencia en caso de olvido */}
        <div className="forgot-password-box">
          <button
            type="button"
            className="btn-link-forgot"
            onClick={onForgotPassword}
          >
            ¿Olvidaste tu contraseña maestra? Restablecer baúl
          </button>
        </div>

        {/* Acceso rápido de prueba para desarrollo (Solo en Modo Dev / Admin) */}
        {showDevTools && (
          <div className="dev-shortcut-box">
            <span className="dev-badge">Modo Desarrollo</span>
            <p>¿Quieres probar rápido sin escribir?</p>
            <button
              type="button"
              className="btn-shortcut"
              onClick={() => handleQuickKey('rasputin')}
              disabled={unlocking}
            >
              🪄 Usar clave sugerida: <code>"rasputin"</code>
            </button>
          </div>
        )}

        {/* Garantía Zero-Knowledge Directa */}
        <p className="auth-gate-footnote">
          🛡️ Tu clave se procesa en memoria volátil y nunca se envía a ningún servidor.
        </p>
      </div>
    </div>
  );
}
