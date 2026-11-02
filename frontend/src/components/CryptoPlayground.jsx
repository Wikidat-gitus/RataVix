import React, { useState } from 'react';
import {
  generateSalt,
  deriveKeyFromPassword,
  encryptText,
  decryptText,
  encryptBinary,
  decryptBinary,
  bufferToBase64
} from '../crypto/index.js';

export default function CryptoPlayground() {
  // Estado de derivación de clave
  const [password, setPassword] = useState('MagiaZeroKnowledge2026!');
  const [salt, setSalt] = useState(() => generateSalt());
  const [cryptoKey, setCryptoKey] = useState(null);
  const [isDeriving, setIsDeriving] = useState(false);
  const [derivationTime, setDerivationTime] = useState(null);

  // Estado de prueba de texto
  const [textInput, setTextInput] = useState('Documento Confidencial - RataVix 2026');
  const [encryptedText, setEncryptedText] = useState(null);
  const [textIv, setTextIv] = useState(null);
  const [decryptedText, setDecryptedText] = useState(null);

  // Estado de prueba de archivo
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptedFileBuffer, setEncryptedFileBuffer] = useState(null);
  const [fileIv, setFileIv] = useState(null);
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [decryptedFileName, setDecryptedFileName] = useState('');

  // 1. Derivar Clave
  const handleDeriveKey = async () => {
    try {
      setIsDeriving(true);
      const start = performance.now();
      const key = await deriveKeyFromPassword(password, salt);
      const end = performance.now();
      setCryptoKey(key);
      setDerivationTime((end - start).toFixed(2));
    } catch (err) {
      alert('Error derivando clave: ' + err.message);
    } finally {
      setIsDeriving(false);
    }
  };

  // 2. Cifrar Texto
  const handleEncryptText = async () => {
    if (!cryptoKey) {
      alert('Primero debes derivar la clave maestra.');
      return;
    }
    try {
      const result = await encryptText(textInput, cryptoKey);
      setEncryptedText(result.cipherText);
      setTextIv(result.iv);
      setDecryptedText(null);
    } catch (err) {
      alert('Error al cifrar texto: ' + err.message);
    }
  };

  // 3. Descifrar Texto
  const handleDecryptText = async () => {
    if (!cryptoKey || !encryptedText || !textIv) return;
    try {
      const plain = await decryptText(encryptedText, textIv, cryptoKey);
      setDecryptedText(plain);
    } catch (err) {
      alert('Error al descifrar texto: ' + err.message);
    }
  };

  // 4. Cifrar Archivo
  const handleEncryptFile = async () => {
    if (!cryptoKey || !selectedFile) {
      alert('Selecciona un archivo y asegúrate de tener la clave derivada.');
      return;
    }
    try {
      const result = await encryptBinary(selectedFile, cryptoKey);
      setEncryptedFileBuffer(result.encryptedBuffer);
      setFileIv(result.iv);
      setDecryptedFileUrl(null);
    } catch (err) {
      alert('Error cifrando archivo: ' + err.message);
    }
  };

  // 5. Descifrar Archivo
  const handleDecryptFile = async () => {
    if (!cryptoKey || !encryptedFileBuffer || !fileIv) return;
    try {
      const decryptedBuffer = await decryptBinary(encryptedFileBuffer, fileIv, cryptoKey);
      const blob = new Blob([decryptedBuffer], { type: selectedFile.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setDecryptedFileUrl(url);
      setDecryptedFileName(selectedFile.name);
    } catch (err) {
      alert('Error descifrando archivo: ' + err.message);
    }
  };

  return (
    <div className="crypto-playground">
      <div className="playground-header">
        <h3>🧪 Laboratorio Criptográfico Interactivo (Web Crypto API)</h3>
        <p>Valida en tiempo real la derivación PBKDF2 y el cifrado/descifrado AES-GCM (256 bits) en tu propio navegador.</p>
      </div>

      {/* SECCIÓN 1: DERIVACIÓN DE CLAVE */}
      <div className="playground-card">
        <h4>1. Derivación de Clave Maestra (PBKDF2 - 100,000 iteraciones)</h4>
        <div className="form-group-row">
          <div className="input-field">
            <label>Contraseña Maestra:</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa una clave secreta"
            />
          </div>
          <div className="input-field">
            <label>Salt Criptográfico (Base64):</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                readOnly
              />
              <button className="btn-secondary" onClick={() => setSalt(generateSalt())} title="Generar nuevo Salt">
                🎲
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-primary" onClick={handleDeriveKey} disabled={isDeriving}>
            {isDeriving ? 'Derivando con PBKDF2...' : '🔑 Derivar CryptoKey AES-GCM'}
          </button>
          {cryptoKey && (
            <span className="badge-success">
              ✅ Clave lista en memoria ({derivationTime} ms) • Algoritmo: AES-GCM 256
            </span>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: CIFRADO DE METADATOS Y TEXTO */}
      <div className="playground-card">
        <h4>2. Cifrado de Nombres de Carpetas / Archivos (Texto a Base64)</h4>
        <div className="input-field">
          <label>Nombre en claro (lo que tú ves):</label>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn-action" onClick={handleEncryptText} disabled={!cryptoKey}>
            🔒 Cifrar Nombre
          </button>
          {encryptedText && (
            <button className="btn-action" onClick={handleDecryptText} disabled={!cryptoKey}>
              🔓 Descifrar
            </button>
          )}
        </div>

        {encryptedText && (
          <div className="crypto-result-box">
            <div className="result-row">
              <strong>nombre_cifrado (Base64):</strong>
              <code>{encryptedText}</code>
            </div>
            <div className="result-row">
              <strong>iv (Base64, 96 bits):</strong>
              <code>{textIv}</code>
            </div>
            {decryptedText && (
              <div className="result-row success-row">
                <strong>Resultado Descifrado:</strong>
                <span className="decrypted-pill">{decryptedText}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: CIFRADO DE ARCHIVOS BINARIOS */}
      <div className="playground-card">
        <h4>3. Cifrado de Archivos Reales (Directo en RAM antes de Google Drive)</h4>
        <div className="input-field">
          <label>Selecciona cualquier archivo de prueba:</label>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
          />
        </div>

        {selectedFile && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
            Archivo seleccionado: <strong>{selectedFile.name}</strong> ({selectedFile.size} bytes)
          </p>
        )}

        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn-action" onClick={handleEncryptFile} disabled={!cryptoKey || !selectedFile}>
            🛡️ Cifrar Archivo Binario
          </button>
          {encryptedFileBuffer && (
            <button className="btn-action" onClick={handleDecryptFile} disabled={!cryptoKey}>
              ✨ Descifrar y Restaurar
            </button>
          )}
        </div>

        {encryptedFileBuffer && (
          <div className="crypto-result-box">
            <div className="result-row">
              <strong>Tamaño cifrado en RAM:</strong>
              <span>{encryptedFileBuffer.byteLength} bytes (incluye tag de autenticación de 128 bits)</span>
            </div>
            <div className="result-row">
              <strong>IV de archivo (Base64):</strong>
              <code>{fileIv}</code>
            </div>
            {decryptedFileUrl && (
              <div className="result-row success-row">
                <strong>Archivo recuperado:</strong>
                <a href={decryptedFileUrl} download={decryptedFileName} className="download-link">
                  ⬇️ Descargar "{decryptedFileName}" restaurado
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
