import React, { useState, useEffect } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { downloadEncryptedFileFromDrive } from '../services/googleDrive';
import { api } from '../services/api';
import { getFileCategory } from '../utils/fileTypes';

export default function TreasureViewerModal({ tesoro, onClose, onDownload }) {
  const { decryptFileBlob } = useCrypto();
  const { isGoogleConnected, googleAccessToken } = useGoogleAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [copied, setCopied] = useState(false);

  const category = getFileCategory(tesoro.plainName, tesoro.tipo_mime);

  useEffect(() => {
    let activeUrl = null;

    async function loadAndDecrypt() {
      setLoading(true);
      setError(null);
      try {
        // 1. Obtener buffer cifrado y vector de inicialización desde el almacenamiento persistente de Drive
        let buffer;
        let fileIv;

        if (tesoro.drive_file_id.startsWith('gdrive-mock-')) {
          const driveRecord = await api.downloadDriveMock(tesoro.drive_file_id);
          buffer = driveRecord.encryptedBuffer || driveRecord;
          fileIv = driveRecord.fileIv || tesoro.iv;
        } else {
          if (!isGoogleConnected || !googleAccessToken) {
            throw new Error('Debes conectar tu cuenta de Google Drive para visualizar este archivo.');
          }
          const driveRecord = await downloadEncryptedFileFromDrive({
            driveFileId: tesoro.drive_file_id,
            accessToken: googleAccessToken,
            fallbackIv: tesoro.iv,
          });
          buffer = driveRecord.encryptedBuffer;
          fileIv = driveRecord.fileIv || tesoro.iv;
        }



        // 2. Descifrar en memoria RAM del navegador
        const decryptedArrayBuffer = await decryptFileBlob(buffer, fileIv);

        // 3. Procesar según la categoría
        if (category.type === 'text') {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(decryptedArrayBuffer);
          setTextContent(text);
        } else {
          // Generar Blob con el tipo MIME adecuado
          let mime = tesoro.tipo_mime;
          if (!mime || mime === 'application/octet-stream') {
            if (category.type === 'pdf') mime = 'application/pdf';
            else if (category.type === 'image') mime = `image/${tesoro.plainName.split('.').pop()}`;
            else if (category.type === 'audio') mime = 'audio/mpeg';
            else if (category.type === 'video') mime = 'video/mp4';
          }
          const blob = new Blob([decryptedArrayBuffer], { type: mime });
          activeUrl = URL.createObjectURL(blob);
          setBlobUrl(activeUrl);
        }
      } catch (err) {
        console.error('Error al abrir y descifrar el tesoro:', err);
        setError('No se pudo descifrar este archivo. Comprueba tu clave maestra.');
      } finally {
        setLoading(false);
      }
    }

    loadAndDecrypt();

    // Limpieza de memoria (Zero-Knowledge): revocar Blob URL al cerrar el visor
    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [tesoro, decryptFileBlob, category.type]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Formato legible de tamaño
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="viewer-backdrop">
      <div className="viewer-window">
        {/* Cabecera del Visor */}
        <header className="viewer-header">
          <div className="viewer-title-group">
            <span className="viewer-type-icon">{category.icon}</span>
            <div className="viewer-meta-text">
              <h3 title={tesoro.plainName}>{tesoro.plainName}</h3>
              <div className="viewer-meta-tags">
                <span className={`file-badge ${category.badgeClass}`}>{category.label}</span>
                <span className="file-size-tag">{formatBytes(tesoro.tamano_bytes)}</span>
                <span className="zk-tag">🔓 Descifrado en RAM</span>
              </div>
            </div>
          </div>

          <div className="viewer-header-actions">
            {category.type === 'text' && !loading && !error && (
              <button
                type="button"
                className="btn-viewer-action"
                onClick={handleCopyText}
                title="Copiar contenido"
              >
                {copied ? '✅ Copiado' : '📋 Copiar'}
              </button>
            )}

            <button
              type="button"
              className="btn-viewer-action"
              onClick={() => onDownload(tesoro)}
              title="Descargar copia descifrada"
            >
              ⬇️ Descargar
            </button>

            <button
              type="button"
              className="btn-viewer-close"
              onClick={onClose}
              title="Cerrar visor"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Cuerpo del Visor */}
        <div className="viewer-body">
          {loading ? (
            <div className="viewer-loading">
              <span className="spinner-dot"></span>
              <p>Descifrando archivo con AES-GCM en la memoria RAM...</p>
            </div>
          ) : error ? (
            <div className="viewer-error">
              <span style={{ fontSize: '2.5rem' }}>⚠️</span>
              <h4>Error de Visualización</h4>
              <p>{error}</p>
            </div>
          ) : (
            <div className="viewer-display-area">
              {/* 1. Imagen */}
              {category.type === 'image' && blobUrl && (
                <div className="viewer-media-wrap">
                  <img src={blobUrl} alt={tesoro.plainName} className="viewer-image-preview" />
                </div>
              )}

              {/* 2. PDF */}
              {category.type === 'pdf' && blobUrl && (
                <div className="viewer-pdf-wrap">
                  <iframe
                    src={blobUrl}
                    title={tesoro.plainName}
                    className="viewer-pdf-iframe"
                  />
                </div>
              )}

              {/* 3. Texto / Código */}
              {category.type === 'text' && (
                <div className="viewer-text-wrap">
                  <pre className="viewer-code-view">
                    <code>{textContent}</code>
                  </pre>
                </div>
              )}

              {/* 4. Audio */}
              {category.type === 'audio' && blobUrl && (
                <div className="viewer-audio-wrap">
                  <div className="media-player-card">
                    <span style={{ fontSize: '4rem' }}>🎵</span>
                    <h4>{tesoro.plainName}</h4>
                    <audio controls src={blobUrl} className="native-audio-player" />
                  </div>
                </div>
              )}

              {/* 5. Video */}
              {category.type === 'video' && blobUrl && (
                <div className="viewer-video-wrap">
                  <video controls src={blobUrl} className="viewer-video-player" />
                </div>
              )}

              {/* 6. Binario / Comprimido u otro sin preview nativo */}
              {(!category.canPreviewInline || (category.type !== 'image' && category.type !== 'pdf' && category.type !== 'text' && category.type !== 'audio' && category.type !== 'video')) && (
                <div className="viewer-binary-fallback">
                  <span style={{ fontSize: '4rem' }}>{category.icon}</span>
                  <h4>Vista previa no disponible en el navegador</h4>
                  <p>
                    Este tipo de archivo (<strong>{category.label}</strong>) no se puede previsualizar directamente en pantalla.
                  </p>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => onDownload(tesoro)}
                  >
                    ⬇️ Descargar archivo descifrado
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
