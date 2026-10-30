import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { api } from '../services/api';

export default function UnlockVaultModal({
  onLogout,
  onForgotPassword,
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
        {/* Encabezado Mágico */}
        <div className="unlock-header">
          <div className="vault-lock-orb">
            <span className="lock-icon">🔒</span>
          </div>
          <span className="auth-step-pill">Paso 2 de 2 • Desbloqueo Zero-Knowledge</span>

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

          <h2>Desbloquea tu Baúl Mágico</h2>
          <p>
            Ingresa tu <strong>Contraseña Maestra</strong> para derivar tu clave criptográfica de 256 bits en memoria volátil (RAM).
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

        {/* Garantía Zero-Knowledge */}
        <div className="zk-guarantee-footer">
          <span className="shield-icon">🛡️</span>
          <p>
            <strong>Garantía Zero-Knowledge:</strong> Esta clave <em>nunca</em> se guarda en cookies, ni en almacenamiento persistente, ni se envía a internet. Al cerrar o recargar la pestaña, se destruye automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
