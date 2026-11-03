import './GoogleAuthGate.css';
import React from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import ratavixLogo from '../assets/ratavix-logo.png';

/**
 * Pantalla de Bienvenida / Inicio de Sesión:
 * Simple, directa, sobria y sin sobrecarga visual.
 */
export default function GoogleAuthGate({ onContinueLocal, showDevTools = false }) {
  const { connectGoogleDrive, isLoadingAuth, authError } = useGoogleAuth();

  return (
    <div className="auth-gate-container">
      <div className="auth-gate-card">
        {/* Cabecera limpia y directa */}
        <div className="auth-gate-header">
          <img src={ratavixLogo} alt="RataVix" className="auth-gate-logo-img" />
          <h2>Bienvenido a RataVix</h2>
          <p>
            Almacena, organiza y protege tus archivos en tu propio Google Drive.
          </p>
        </div>

        {/* Botón Principal Oficial de Google */}
        <div className="auth-gate-action">
          <button
            type="button"
            className="btn-google-primary"
            onClick={connectGoogleDrive}
            disabled={isLoadingAuth}
          >
            {isLoadingAuth ? (
              <>
                <span className="spinner-dot"></span>
                <span>Conectando con Google...</span>
              </>
            ) : (
              <>
                <svg className="google-icon-svg" viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </>
            )}
          </button>

          {authError && (
            <div className="unlock-error-banner" style={{ marginTop: '0.85rem' }}>
              ⚠️ {authError}
            </div>
          )}
        </div>

        {/* Garantía y Privacidad directa */}
        <p className="auth-gate-footnote">
          🔒 Tus archivos se guardan directamente en tu cuenta de Google. Privacidad y control total.
        </p>

        {/* Acceso local de pruebas si aplica */}
        {showDevTools && onContinueLocal && (
          <div className="auth-gate-dev">
            <button
              type="button"
              className="btn-link-muted"
              onClick={onContinueLocal}
            >
              Continuar en modo de pruebas local →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
