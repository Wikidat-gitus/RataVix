import React, { useState } from 'react';
import './App.css';
import { CryptoProvider, useCrypto } from './context/CryptoContext';
import { GoogleAuthProvider, useGoogleAuth } from './context/GoogleAuthContext';
import UnlockVaultModal from './components/UnlockVaultModal';
import VaultExplorer from './components/VaultExplorer';
import CryptoPlayground from './components/CryptoPlayground';

function AppContent() {
  const { isUnlocked, lockVault } = useCrypto();
  const {
    isGoogleConnected,
    googleUser,
    connectGoogleDrive,
    disconnectGoogleDrive,
    isLoadingAuth,
    authError,
  } = useGoogleAuth();
  const [activeTab, setActiveTab] = useState('vault'); // Pestaña principal: Mi Baúl Virtual
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline'

  React.useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch {
        setBackendStatus('offline');
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Header Principal */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-icon">🧙‍♂️</div>
          <div className="brand-text">
            <h1>Baúl Mágico 2</h1>
            <p>Almacenamiento Zero-Knowledge en Google Drive</p>
          </div>
        </div>

        <div className="header-right">
          {/* Badge de Google Drive OAuth */}
          {isGoogleConnected ? (
            <div className="security-badge unlocked-badge" title="Almacenamiento activo en tu Google Drive (carpeta 'Baúl Mágico - Datos Cifrados')">
              <span className="unlocked-pulse"></span>
              <span>☁️ {googleUser?.email || 'Google Drive Conectado'}</span>
              <button
                type="button"
                className="btn-text-small"
                onClick={disconnectGoogleDrive}
                title="Desconectar cuenta de Google Drive"
                style={{ marginLeft: '0.4rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                ✖
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-shortcut"
              onClick={connectGoogleDrive}
              disabled={isLoadingAuth}
              title="Conecta tu Google Drive para almacenar los blobs cifrados directamente en tu nube"
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
            >
              {isLoadingAuth ? 'Conectando...' : '☁️ Conectar Google Drive'}
            </button>
          )}

          {/* Badge de Estado del Backend */}
          <div
            className={`security-badge ${backendStatus === 'online' ? 'unlocked-badge' : 'locked-badge'}`}
            title={backendStatus === 'online' ? 'Conectado a FastAPI (puerto 8000)' : 'Backend no detectado en puerto 8000'}
          >
            <span className={backendStatus === 'online' ? 'unlocked-pulse' : 'pulse-dot'}></span>
            <span>
              {backendStatus === 'checking'
                ? 'Conectando...'
                : backendStatus === 'online'
                ? '🟢 API FastAPI Activa'
                : '🔴 API Desconectada'}
            </span>
          </div>

          {/* Badge de Seguridad Dinámico */}
          <div className={`security-badge ${isUnlocked ? 'unlocked-badge' : 'locked-badge'}`}>
            <span className={isUnlocked ? 'unlocked-pulse' : 'pulse-dot'}></span>
            <span>{isUnlocked ? '🔓 Baúl Abierto (RAM)' : '🔒 Baúl Bloqueado'}</span>
          </div>

          {isUnlocked && (
            <button
              type="button"
              className="btn-shortcut"
              onClick={lockVault}
              title="Cerrar y destruir clave en RAM"
            >
              🔒 Bloquear
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        {/* Selector de Pestañas */}
        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            🏰 Mi Baúl Virtual
          </button>
          <button
            className={`tab-btn ${activeTab === 'crypto' ? 'active' : ''}`}
            onClick={() => setActiveTab('crypto')}
          >
            🧪 Laboratorio Criptográfico
          </button>
          <button
            className={`tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}
            onClick={() => setActiveTab('resumen')}
          >
            📋 Visión y Arquitectura
          </button>
        </nav>

        {/* 1. Pestaña Principal: Mi Baúl Virtual */}
        {activeTab === 'vault' && (
          <div className="tab-pane">
            {!isUnlocked ? (
              <UnlockVaultModal />
            ) : (
              <VaultExplorer />
            )}
          </div>
        )}

        {/* 2. Pestaña: Laboratorio Criptográfico */}
        {activeTab === 'crypto' && (
          <div className="tab-pane">
            <CryptoPlayground />
          </div>
        )}

        {/* 3. Pestaña: Visión y Arquitectura */}
        {activeTab === 'resumen' && (
          <div className="tab-pane">
            <section className="hero-card">
              <span className="hero-pill">Fase 2: Criptografía y Explorador Activo</span>
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

      {/* Footer */}
      <footer className="app-footer">
        <p>Baúl Mágico 2 — Arquitectura de Conocimiento Cero • Frontend React + Vite</p>
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
