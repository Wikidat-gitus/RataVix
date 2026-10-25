import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('resumen');

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

        <div className="security-badge">
          <span className="pulse-dot"></span>
          <span>Zero-Knowledge Activo</span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        {/* Tarjeta Hero */}
        <section className="hero-card">
          <span className="hero-pill">Fase 1: Cimientos Listos</span>
          <h2 className="hero-title">
            Tus tesoros digitales, <span>100% blindados</span>.
          </h2>
          <p className="hero-description">
            Cifrado AES-GCM de 256 bits directo en tu navegador. Ni el servidor, ni Google,
            ni nadie puede leer lo que guardas en tu baúl personal.
          </p>
        </section>

        {/* Pilares de la Arquitectura */}
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

        {/* Maqueta de Vista Previa del Baúl Virtual */}
        <section className="vault-preview">
          <div className="vault-preview-header">
            <div>
              <h3>Vista Previa del Baúl Virtual</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Estructura de datos según el contrato de API oficial
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>Simulación Activa</span>
          </div>

          <div className="vault-items-grid">
            <div className="vault-item">
              <span style={{ fontSize: '1.5rem' }}>📁</span>
              <div className="vault-item-info">
                <strong>Documentos Mágicos</strong>
                <span>Baúl virtual</span>
              </div>
            </div>

            <div className="vault-item">
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
              <div className="vault-item-info">
                <strong>cuentas_clave.kdbx</strong>
                <span>1.4 MB • Cifrado AES</span>
              </div>
            </div>

            <div className="vault-item">
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
              <div className="vault-item-info">
                <strong>contrato_confidencial.pdf</strong>
                <span>3.8 MB • Cifrado AES</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Baúl Mágico 2 — Arquitectura de Conocimiento Cero • Frontend React + Vite</p>
      </footer>
    </div>
  );
}
