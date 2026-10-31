import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { CryptoProvider, useCrypto } from './context/CryptoContext';
import { GoogleAuthProvider, useGoogleAuth } from './context/GoogleAuthContext';
import GoogleAuthGate from './components/GoogleAuthGate';
import CreateMasterKeyModal from './components/CreateMasterKeyModal';
import UnlockVaultModal from './components/UnlockVaultModal';
import ResetVaultModal from './components/ResetVaultModal';
import VaultExplorer from './components/VaultExplorer';
import CryptoPlayground from './components/CryptoPlayground';
import AdminMaintenancePanel from './components/AdminMaintenancePanel';

function AppContent() {
  const { isUnlocked, lockVault } = useCrypto();
  const {
    isGoogleConnected,
    googleUser,
    backendUser,
    disconnectGoogleDrive,
  } = useGoogleAuth();

  // Control de Modo Desarrollador / Admin (persistido o por URL ?dev=true)
  const [isDevMode, setIsDevMode] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('dev') === 'true' || urlParams.get('admin') === 'true') {
        return true;
      }
      return localStorage.getItem('baul_dev_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [isLocalMock, setIsLocalMock] = useState(() => {
    return sessionStorage.getItem('baul_local_mock') === 'true';
  });

  // Selector de Modo: 'libre' (por defecto) o 'secreto' (Zero-Knowledge)
  const [currentMode, setCurrentMode] = useState('libre');

  const [showResetModal, setShowResetModal] = useState(false);
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' | 'admin' | 'crypto' | 'architecture'
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [backendLatency, setBackendLatency] = useState(null);

  // Verificación de Salud y Latencia del Backend
  const checkHealth = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const t0 = performance.now();
      const res = await fetch(`${apiBase}/health`);
      const t1 = performance.now();
      if (res.ok) {
        setBackendStatus('online');
        setBackendLatency(Math.round(t1 - t0));
      } else {
        setBackendStatus('offline');
        setBackendLatency(null);
      }
    } catch {
      setBackendStatus('offline');
      setBackendLatency(null);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Atajo de teclado: Ctrl + Shift + D (o Cmd + Shift + D) para alternar Modo Admin
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDevMode((prev) => {
          const next = !prev;
          localStorage.setItem('baul_dev_mode', next ? 'true' : 'false');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDevMode = () => {
    setIsDevMode((prev) => {
      const next = !prev;
      localStorage.setItem('baul_dev_mode', next ? 'true' : 'false');
      return next;
    });
  };

  const isSessionStarted = isGoogleConnected || isLocalMock;
  // Determinar si el usuario ya tiene su contraseña maestra configurada
  const userHasMasterKey = Boolean(backendUser?.tiene_clave_maestra);

  // Cierre de Sesión Unificado
  const handleLogout = () => {
    lockVault();
    disconnectGoogleDrive();
    setIsLocalMock(false);
    sessionStorage.removeItem('baul_local_mock');
    setCurrentMode('libre');
  };

  return (
    <div className={`app-container ${isDevMode ? 'dev-mode-active' : ''}`}>
      {/* 🛠️ BARRA SUPERIOR EXCLUSIVA PARA MODO DESARROLLADOR / ADMIN */}
      {isDevMode && (
        <aside className="admin-topbar">
          <div className="admin-topbar-left">
            <span className="admin-topbar-badge">🛠️ MODO ADMIN / DEV</span>
            <span
              className={`admin-status-indicator ${backendStatus === 'online' ? 'online' : 'offline'}`}
              title="Monitoreo de FastAPI en Render / Neon"
            >
              {backendStatus === 'online'
                ? `🟢 Backend Online (${backendLatency !== null ? `${backendLatency}ms` : 'OK'})`
                : '🔴 Backend Offline'}
            </span>
            <span className="admin-env-pill">
              {import.meta.env.VITE_API_URL ? 'Cloud (Render/Neon)' : 'Localhost'}
            </span>
          </div>

          <div className="admin-topbar-center">
            <nav className="admin-nav-tabs">
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
                onClick={() => setActiveTab('vault')}
              >
                🏰 Baúl Virtual
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                ⚙️ Mantenimiento
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'crypto' ? 'active' : ''}`}
                onClick={() => setActiveTab('crypto')}
              >
                🧪 Lab Cripto
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'architecture' ? 'active' : ''}`}
                onClick={() => setActiveTab('architecture')}
              >
                📋 Arquitectura
              </button>
            </nav>
          </div>

          <div className="admin-topbar-right">
            <button
              type="button"
              className="btn-exit-dev"
              onClick={toggleDevMode}
              title="Volver a la vista limpia de usuario normal (Ctrl+Shift+D)"
            >
              ✖️ Salir a Modo Usuario
            </button>
          </div>
        </aside>
      )}

      {/* Header Principal de la Aplicación */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-icon">🧙‍♂️</div>
          <div className="brand-text">
            <h1>Baúl Mágico 2</h1>
            <p>Almacenamiento Zero-Knowledge en Google Drive</p>
          </div>
        </div>

        <div className="header-right">
          {isSessionStarted && (
            <>
              {/* Badge de Cuenta Conectada */}
              <div
                className="security-badge unlocked-badge"
                title="Cuenta autenticada en esta sesión"
              >
                <span className="unlocked-pulse"></span>
                <span>
                  {isGoogleConnected
                    ? `☁️ ${googleUser?.email || 'Google Drive Conectado'}`
                    : '💾 Modo Simulado'}
                </span>
              </div>

              {/* Badge de Seguridad Dinámico según el Modo Activo */}
              <div
                className={`security-badge ${
                  currentMode === 'libre'
                    ? 'free-mode-badge'
                    : isUnlocked
                    ? 'unlocked-badge'
                    : 'locked-badge'
                }`}
              >
                <span
                  className={
                    currentMode === 'libre'
                      ? 'free-mode-dot'
                      : isUnlocked
                      ? 'unlocked-pulse'
                      : 'pulse-dot'
                  }
                ></span>
                <span>
                  {currentMode === 'libre'
                    ? '🔓 Modo Libre Activo'
                    : isUnlocked
                    ? '✨ Modo Secreto (RAM)'
                    : '🔒 Modo Secreto Bloqueado'}
                </span>
              </div>

              {/* ÚNICO BOTÓN: Cerrar Sesión */}
              <button
                type="button"
                className="btn-shortcut btn-logout-header"
                onClick={handleLogout}
                title="Cerrar sesión de forma segura y destruir clave en RAM"
              >
                🚪 Cerrar Sesión
              </button>
            </>
          )}
        </div>
      </header>

      {/* Banner Amigable de Despertar del Backend en Render */}
      {!isDevMode && backendStatus === 'offline' && (
        <div className="cold-start-banner">
          <span className="cold-start-spinner">⏳</span>
          <div>
            <strong>Conectando con tu servidor seguro...</strong>
            <p>El backend gratuito en la nube puede tardar unos segundos en despertar. Por favor espera un momento.</p>
          </div>
          <button
            type="button"
            className="btn-cold-start-retry"
            onClick={checkHealth}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="main-content">
        {/* Selector de Modo: Modo Libre vs. Modo Secreto (Solo con sesión iniciada) */}
        {isSessionStarted && (activeTab === 'vault' || !isDevMode) && (
          <div className="mode-selector-container">
            <div className="mode-selector-pills">
              <button
                type="button"
                className={`mode-pill-btn ${currentMode === 'libre' ? 'active-libre' : ''}`}
                onClick={() => setCurrentMode('libre')}
              >
                <span className="mode-pill-icon">🔓</span>
                <div className="mode-pill-info">
                  <span className="mode-pill-title">Modo Libre</span>
                  <span className="mode-pill-subtitle">Archivos estándar • Sin clave</span>
                </div>
              </button>

              <button
                type="button"
                className={`mode-pill-btn ${currentMode === 'secreto' ? 'active-secreto' : ''}`}
                onClick={() => setCurrentMode('secreto')}
              >
                <span className="mode-pill-icon">{isUnlocked ? '✨' : '🔒'}</span>
                <div className="mode-pill-info">
                  <span className="mode-pill-title">Modo Secreto</span>
                  <span className="mode-pill-subtitle">
                    {isUnlocked ? 'Bóveda abierta en RAM' : 'Zero-Knowledge (AES-256)'}
                  </span>
                </div>
                {isUnlocked && <span className="mode-unlocked-dot"></span>}
              </button>
            </div>
          </div>
        )}

        {/* 1. Vista de Usuario: Explorador Virtual (O pestaña 'vault' en modo dev) */}
        {(activeTab === 'vault' || !isDevMode) && (
          <div className="tab-pane">
            {!isSessionStarted ? (
              <GoogleAuthGate
                showDevTools={isDevMode}
                onContinueLocal={() => {
                  setIsLocalMock(true);
                  sessionStorage.setItem('baul_local_mock', 'true');
                }}
              />
            ) : currentMode === 'libre' ? (
              /* MODO LIBRE: Acceso inmediato, sin contraseña maestra */
              <VaultExplorer
                onLogout={handleLogout}
                mode="libre"
                onSwitchMode={() => setCurrentMode('secreto')}
              />
            ) : !isUnlocked ? (
              /* MODO SECRETO: Requiere contraseña maestra en RAM */
              !userHasMasterKey ? (
                /* Flujo A: Usuario Nuevo sin contraseña maestra */
                <CreateMasterKeyModal
                  onLogout={handleLogout}
                  onBackToFreeMode={() => setCurrentMode('libre')}
                  isLocalMock={isLocalMock}
                  showDevTools={isDevMode}
                />
              ) : (
                /* Flujo B: Usuario Existente con contraseña maestra */
                <UnlockVaultModal
                  onLogout={handleLogout}
                  onForgotPassword={() => setShowResetModal(true)}
                  onBackToFreeMode={() => setCurrentMode('libre')}
                  isLocalMock={isLocalMock}
                  showDevTools={isDevMode}
                />
              )
            ) : (
              /* Flujo C: Modo Secreto Desbloqueado con clave en RAM */
              <VaultExplorer
                onLogout={handleLogout}
                mode="secreto"
                onSwitchMode={() => setCurrentMode('libre')}
              />
            )}
          </div>
        )}

        {/* 2. Vista Exclusiva Admin: Consola de Mantenimiento y Diagnóstico */}
        {isDevMode && activeTab === 'admin' && (
          <div className="tab-pane">
            <AdminMaintenancePanel
              backendStatus={backendStatus}
              backendLatency={backendLatency}
              onCheckHealth={checkHealth}
              isLocalMock={isLocalMock}
              onToggleLocalMock={() => {
                const next = !isLocalMock;
                setIsLocalMock(next);
                sessionStorage.setItem('baul_local_mock', next ? 'true' : 'false');
              }}
            />
          </div>
        )}

        {/* 3. Vista Exclusiva Admin: Laboratorio Criptográfico */}
        {isDevMode && activeTab === 'crypto' && (
          <div className="tab-pane">
            <CryptoPlayground />
          </div>
        )}

        {/* 4. Vista Exclusiva Admin: Especificación de Arquitectura */}
        {isDevMode && activeTab === 'architecture' && (
          <div className="tab-pane">
            <section className="hero-card">
              <span className="hero-pill">Baúl Mágico 2 • Cero Conocimiento</span>
              <h2 className="hero-title">
                Tus tesoros digitales, <span>100% blindados</span>.
              </h2>
              <p className="hero-description">
                Cifrado AES-GCM de 256 bits directo en tu navegador. Ni el servidor, ni Google,
                ni nadie puede leer lo que guardas en tu baúl personal.
              </p>
            </section>

            <section className="features-grid">
              <div className="feature-box">
                <span className="icon">🛡️</span>
                <h3>Cifrado en Cliente</h3>
                <p>Algoritmo AES-GCM (256 bits) usando la Web Crypto API nativa. El archivo sale de tu equipo ya cifrado.</p>
              </div>

              <div className="feature-box">
                <span className="icon">🔑</span>
                <h3>Clave Maestra Efímera</h3>
                <p>Vive solo en la memoria RAM del navegador. Nunca se envía por red ni se guarda en almacenamiento persistente.</p>
              </div>

              <div className="feature-box">
                <span className="icon">☁️</span>
                <h3>Directo a Google Drive</h3>
                <p>Los archivos cifrados se almacenan en tu propio Drive. El backend solo almacena nombres virtuales cifrados.</p>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Modal de Purga y Reseteo de Emergencia por Olvido de Clave */}
      {showResetModal && (
        <ResetVaultModal
          onClose={() => setShowResetModal(false)}
          isLocalMock={isLocalMock}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>Baúl Mágico 2 — Arquitectura de Conocimiento Cero • Frontend React + Vite</p>
          <div className="footer-actions">
            <button
              type="button"
              className={`btn-footer-admin ${isDevMode ? 'active' : ''}`}
              onClick={toggleDevMode}
              title="Alternar Modo Desarrollador / Admin (Atajo: Ctrl + Shift + D)"
            >
              {isDevMode ? '🛠️ Modo Admin Activo' : '🛠️ Modo Admin'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <GoogleAuthProvider>
      <CryptoProvider>
        <AppContent />
      </CryptoProvider>
    </GoogleAuthProvider>
  );
}
