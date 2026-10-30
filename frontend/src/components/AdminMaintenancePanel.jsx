import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import CryptoPlayground from './CryptoPlayground';

export default function AdminMaintenancePanel({
  backendStatus,
  backendLatency,
  onCheckHealth,
  isLocalMock,
  onToggleLocalMock,
}) {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState('diagnostics'); // 'diagnostics' | 'crypto' | 'architecture'
  const [idbStatus, setIdbStatus] = useState(null);
  const [clearingIdb, setClearingIdb] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || 'Localhost (/api)';
  const currentToken = api.getToken();

  // Función para purgar la base de datos IndexedDB local de pruebas
  const handlePurgeIndexedDB = () => {
    setClearingIdb(true);
    try {
      const req = indexedDB.deleteDatabase('baul_magico_drive_db');
      req.onsuccess = () => {
        setIdbStatus('✅ IndexedDB "baul_magico_drive_db" eliminada correctamente.');
        setClearingIdb(false);
      };
      req.onerror = () => {
        setIdbStatus('❌ Error al intentar eliminar IndexedDB.');
        setClearingIdb(false);
      };
      req.onblocked = () => {
        setIdbStatus('⚠️ Eliminación bloqueada: cierra otras pestañas abiertas.');
        setClearingIdb(false);
      };
    } catch (err) {
      setIdbStatus(`❌ Excepción: ${err.message}`);
      setClearingIdb(false);
    }
  };

  return (
    <div className="admin-panel-container">
      {/* Sub-navegación del Panel de Mantenimiento */}
      <div className="admin-subnav">
        <button
          type="button"
          className={`admin-subnav-btn ${activeAdminSubTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('diagnostics')}
        >
          🔍 Diagnóstico y Mantenimiento
        </button>
        <button
          type="button"
          className={`admin-subnav-btn ${activeAdminSubTab === 'crypto' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('crypto')}
        >
          🧪 Laboratorio Criptográfico
        </button>
        <button
          type="button"
          className={`admin-subnav-btn ${activeAdminSubTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('architecture')}
        >
          📋 Arquitectura y Fases
        </button>
      </div>

      {/* 1. Vista de Diagnóstico */}
      {activeAdminSubTab === 'diagnostics' && (
        <div className="admin-diagnostics-grid">
          {/* Tarjeta: Estado del Backend y Base de Datos */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-icon">⚡</span>
              <h3>Servidor Backend & Base de Datos</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-metric-row">
                <span className="metric-label">URL del Backend:</span>
                <code className="metric-code">{apiBase}</code>
              </div>
              <div className="admin-metric-row">
                <span className="metric-label">Estado de la Conexión:</span>
                <span className={`status-pill ${backendStatus === 'online' ? 'status-online' : 'status-offline'}`}>
                  {backendStatus === 'online' ? '🟢 Conectado (Online)' : '🔴 Desconectado (Offline)'}
                </span>
              </div>
              {backendLatency !== null && (
                <div className="admin-metric-row">
                  <span className="metric-label">Latencia (Ping):</span>
                  <span className="metric-value">{backendLatency} ms</span>
                </div>
              )}
              <div className="admin-metric-row">
                <span className="metric-label">Base de Datos:</span>
                <span className="metric-value">PostgreSQL Serverless (Neon AWS US-East)</span>
              </div>

              <div className="admin-actions-bar">
                <button
                  type="button"
                  className="btn-admin-action"
                  onClick={onCheckHealth}
                >
                  🔄 Probar Conexión Manual
                </button>
                <a
                  href="https://dashboard.render.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-admin-link"
                >
                  🌐 Panel Render ↗
                </a>
                <a
                  href="https://console.neon.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-admin-link"
                >
                  🐘 Consola Neon ↗
                </a>
              </div>
            </div>
          </div>

          {/* Tarjeta: Sesión y Control de Seguridad */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-icon">🔐</span>
              <h3>Control de Sesión y Autenticación</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-metric-row">
                <span className="metric-label">Token de Sesión Activo:</span>
                <code className="metric-code">
                  {currentToken
                    ? `${currentToken.slice(0, 10)}...${currentToken.slice(-6)}`
                    : 'Sin sesión activa'}
                </code>
              </div>
              <div className="admin-metric-row">
                <span className="metric-label">Modo Local Simulado (Mock):</span>
                <span className={`status-pill ${isLocalMock ? 'status-warn' : 'status-neutral'}`}>
                  {isLocalMock ? '💾 Simulado (IndexedDB)' : '☁️ Google Drive Real'}
                </span>
              </div>

              <div className="admin-actions-bar">
                <button
                  type="button"
                  className="btn-admin-action"
                  onClick={onToggleLocalMock}
                >
                  {isLocalMock ? '☁️ Cambiar a Google Drive' : '💾 Activar Modo Local Mock'}
                </button>
                <button
                  type="button"
                  className="btn-admin-action btn-danger"
                  onClick={() => {
                    api.clearToken();
                    window.location.reload();
                  }}
                >
                  🚪 Forzar Invalidez de Token
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta: Mantenimiento y Caché Cliente */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-icon">🧹</span>
              <h3>Caché y Almacenamiento Local</h3>
            </div>
            <div className="admin-card-body">
              <p className="admin-card-text">
                Herramientas para limpiar el estado persistido en el navegador de desarrollo sin afectar la base de datos en Neon.
              </p>

              {idbStatus && (
                <div className="admin-status-message">
                  {idbStatus}
                </div>
              )}

              <div className="admin-actions-bar">
                <button
                  type="button"
                  className="btn-admin-action"
                  onClick={handlePurgeIndexedDB}
                  disabled={clearingIdb}
                >
                  🗑️ Purgar IndexedDB de Pruebas
                </button>
                <button
                  type="button"
                  className="btn-admin-action"
                  onClick={() => {
                    sessionStorage.clear();
                    localStorage.removeItem('baul_dev_mode');
                    window.location.reload();
                  }}
                >
                  🔄 Limpiar SessionStorage y Reiniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Vista de Laboratorio Criptográfico */}
      {activeAdminSubTab === 'crypto' && (
        <div className="admin-crypto-wrapper">
          <CryptoPlayground />
        </div>
      )}

      {/* 3. Vista de Arquitectura y Especificaciones */}
      {activeAdminSubTab === 'architecture' && (
        <div className="admin-arch-wrapper">
          <section className="hero-card">
            <span className="hero-pill">Baúl Mágico 2 • Especificación de Arquitectura</span>
            <h2 className="hero-title">
              Arquitectura de <span>Cero Conocimiento</span>
            </h2>
            <p className="hero-description">
              Cifrado AES-GCM de 256 bits directo en el cliente. Ni el servidor FastAPI, ni Neon, ni Google Drive pueden conocer el contenido ni los nombres de los archivos.
            </p>
          </section>

          <section className="features-grid">
            <div className="feature-box">
              <span className="icon">🛡️</span>
              <h3>Cifrado en Cliente (Web Crypto)</h3>
              <p>Algoritmo AES-GCM (256 bits) usando la API nativa de JavaScript. El archivo sale de la memoria RAM ya cifrado.</p>
            </div>
            <div className="feature-box">
              <span className="icon">🔑</span>
              <h3>Clave Maestra Efímera</h3>
              <p>Vive solo en la memoria RAM del navegador. Nunca se envía por red ni se guarda en cookies o discos.</p>
            </div>
            <div className="feature-box">
              <span className="icon">☁️</span>
              <h3>Almacenamiento Directo</h3>
              <p>Los blobs cifrados (.enc) se alojan en Google Drive. El backend en Render solo custodia nombres virtuales cifrados.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

