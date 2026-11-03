import React, { useState, useEffect, useRef } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { downloadEncryptedFileFromDrive, downloadPlainFileFromDrive } from '../services/googleDrive';
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
  const [isPiPActive, setIsPiPActive] = useState(false);

  const isEncrypted = tesoro.es_cifrado === true || (tesoro.es_cifrado !== false && Boolean(tesoro.iv && tesoro.iv.trim()));

  // Telemetría de progreso de descarga / carga en memoria
  const [downloadProgress, setDownloadProgress] = useState({
    percent: 0,
    bytesTransferred: '',
    speed: '',
    eta: '',
    status: isEncrypted ? 'Descargando blob cifrado desde Google Drive...' : 'Cargando archivo desde Google Drive...',
  });

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const category = getFileCategory(tesoro.plainName, tesoro.tipo_mime);

  // Formato legible de tamaño
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    let activeUrl = null;

    async function loadAndDecrypt() {
      setLoading(true);
      setError(null);
      setDownloadProgress({
        percent: 0,
        bytesTransferred: '',
        speed: '',
        eta: '',
        status: isEncrypted ? 'Descargando blob cifrado desde Google Drive...' : 'Cargando archivo desde Google Drive...',
      });

      try {
        let buffer;
        let fileIv;

        if (tesoro.drive_file_id.startsWith('gdrive-mock-')) {
          setDownloadProgress((prev) => ({ ...prev, status: 'Cargando desde almacenamiento local...' }));
          const driveRecord = await api.downloadDriveMock(tesoro.drive_file_id);
          buffer = driveRecord.encryptedBuffer || driveRecord.buffer || driveRecord;
          fileIv = driveRecord.fileIv || tesoro.iv;
        } else {
          if (!isGoogleConnected || !googleAccessToken) {
            throw new Error('Debes conectar tu cuenta de Google Drive para visualizar este archivo.');
          }

          if (isEncrypted) {
            const driveRecord = await downloadEncryptedFileFromDrive({
              driveFileId: tesoro.drive_file_id,
              accessToken: googleAccessToken,
              fallbackIv: tesoro.iv,
              onProgress: ({ percent, loaded, total, speedMBs, etaSec }) => {
                setDownloadProgress((prev) => ({
                  ...prev,
                  percent: Math.min(95, percent),
                  bytesTransferred: `${formatBytes(loaded)} / ${formatBytes(total)}`,
                  speed: speedMBs ? `${speedMBs} MB/s` : prev.speed,
                  eta: etaSec !== null ? (etaSec > 60 ? `~${Math.ceil(etaSec / 60)} min` : `~${etaSec} seg`) : null,
                  status: `Descargando blob cifrado (${percent}%)...`,
                }));
              },
            });
            buffer = driveRecord.encryptedBuffer;
            fileIv = driveRecord.fileIv || tesoro.iv;

            setDownloadProgress((prev) => ({
              ...prev,
              percent: 96,
              status: 'Descifrando archivo con AES-GCM (256 bits) en memoria RAM...',
            }));
          } else {
            buffer = await downloadPlainFileFromDrive({
              driveFileId: tesoro.drive_file_id,
              accessToken: googleAccessToken,
              onProgress: ({ percent, loaded, total, speedMBs, etaSec }) => {
                setDownloadProgress((prev) => ({
                  ...prev,
                  percent,
                  bytesTransferred: `${formatBytes(loaded)} / ${formatBytes(total)}`,
                  speed: speedMBs ? `${speedMBs} MB/s` : prev.speed,
                  eta: etaSec !== null ? (etaSec > 60 ? `~${Math.ceil(etaSec / 60)} min` : `~${etaSec} seg`) : null,
                  status: `Cargando archivo plano (${percent}%)...`,
                }));
              },
            });
          }
        }

        // Descifrar solo si el archivo es cifrado
        const finalBuffer = isEncrypted
          ? await decryptFileBlob(buffer, fileIv)
          : buffer;

        setDownloadProgress((prev) => ({
          ...prev,
          percent: 100,
          status: 'Preparando visualización...',
        }));

        // Procesar según la categoría
        if (category.type === 'text') {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(finalBuffer);
          setTextContent(text);
        } else {
          // Asignar MIME type estricto
          let mime = tesoro.tipo_mime;
          if (category.type === 'pdf') {
            mime = 'application/pdf';
          } else if (category.type === 'video') {
            const ext = tesoro.plainName.split('.').pop()?.toLowerCase();
            mime = ext === 'webm' ? 'video/webm' : 'video/mp4';
          } else if (category.type === 'audio') {
            mime = 'audio/mpeg';
          } else if (!mime || mime === 'application/octet-stream') {
            if (category.type === 'image') mime = `image/${tesoro.plainName.split('.').pop()}`;
          }
          const blob = new Blob([finalBuffer], { type: mime || 'application/octet-stream' });
          activeUrl = URL.createObjectURL(blob);
          setBlobUrl(activeUrl);
        }
      } catch (err) {
        console.error('Error al abrir el archivo:', err);
        setError(
          isEncrypted
            ? `No se pudo descifrar este archivo secreto. (${err.message || 'Comprueba tu clave maestra'})`
            : `No se pudo cargar el archivo desde Google Drive. (${err.message || 'Comprueba tu conexión'})`
        );
      } finally {
        setLoading(false);
      }
    }

    loadAndDecrypt();

    // Limpieza al cerrar: pausar medios y revocar blob
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [tesoro, decryptFileBlob, category.type, isEncrypted, isGoogleConnected, googleAccessToken]);

  // Listener para sincronizar estado de Picture-in-Picture
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [blobUrl, category.type]);

  // Alternar Picture-in-Picture nativo simple como antes
  const handleTogglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.warn('Error al activar Picture-in-Picture:', err);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
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
                <span className={`zk-tag ${isEncrypted ? 'zk-encrypted' : 'zk-plain'}`}>
                  {isEncrypted ? '🔐 Descifrado en RAM' : '☁️ Modo Libre'}
                </span>
              </div>
            </div>
          </div>

          <div className="viewer-header-actions">
            {/* Botón para abrir PDF en pestaña nueva nativa */}
            {category.type === 'pdf' && blobUrl && (
              <button
                type="button"
                className="btn-viewer-action"
                onClick={() => window.open(blobUrl, '_blank')}
                title="Abrir este PDF a pantalla completa en una nueva pestaña del navegador"
              >
                📄 Abrir en Pestaña
              </button>
            )}

            {/* Botón directo de Miniatura (Picture-in-Picture) para Videos */}
            {category.type === 'video' && blobUrl && document.pictureInPictureEnabled && (
              <button
                type="button"
                className={`btn-viewer-action btn-pip ${isPiPActive ? 'active' : ''}`}
                onClick={handleTogglePiP}
                title="Reproducir en ventana miniatura flotante (Picture-in-Picture)"
              >
                {isPiPActive ? '📺 Salir de Miniatura' : '📺 Miniatura'}
              </button>
            )}

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
            <div className="viewer-loading-hud">
              <div className="viewer-hud-counter">
                <span className="viewer-hud-num">{downloadProgress.percent}</span>
                <span className="viewer-hud-sym">%</span>
              </div>
              <p className="viewer-hud-status">{downloadProgress.status}</p>

              {/* Barra Gamer de Carga / Descarga */}
              <div className="viewer-gamer-bar-container">
                <div
                  className={`viewer-gamer-bar-fill ${isEncrypted ? 'encrypted' : 'plain'}`}
                  style={{ width: `${downloadProgress.percent}%` }}
                >
                  <div className="gamer-bar-glow-beam"></div>
                </div>
              </div>

              {/* Telemetría en Vivo */}
              {(downloadProgress.speed || downloadProgress.bytesTransferred || downloadProgress.eta) && (
                <div className="viewer-telemetry-hud">
                  {downloadProgress.speed && (
                    <div className="telemetry-pill">
                      <span className="telemetry-label">⚡ Velocidad</span>
                      <strong className="telemetry-value">{downloadProgress.speed}</strong>
                    </div>
                  )}
                  {downloadProgress.bytesTransferred && (
                    <div className="telemetry-pill">
                      <span className="telemetry-label">📦 Descargado</span>
                      <strong className="telemetry-value">{downloadProgress.bytesTransferred}</strong>
                    </div>
                  )}
                  {downloadProgress.eta && (
                    <div className="telemetry-pill">
                      <span className="telemetry-label">⏱️ Restante</span>
                      <strong className="telemetry-value">{downloadProgress.eta}</strong>
                    </div>
                  )}
                </div>
              )}
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
                  <object
                    data={blobUrl}
                    type="application/pdf"
                    className="viewer-pdf-iframe"
                  >
                    <embed
                      src={blobUrl}
                      type="application/pdf"
                      className="viewer-pdf-iframe"
                    />
                    <div className="pdf-fallback-banner">
                      <p>📄 Este visor requiere abrir el documento directamente en tu navegador.</p>
                      <button
                        type="button"
                        className="btn-action btn-upload"
                        onClick={() => window.open(blobUrl, '_blank')}
                      >
                        Abrir PDF en pestaña nueva
                      </button>
                    </div>
                  </object>
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
                    <audio ref={audioRef} controls src={blobUrl} className="native-audio-player" />
                  </div>
                </div>
              )}

              {/* 5. Video */}
              {category.type === 'video' && blobUrl && (
                <div className="viewer-video-wrap">
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    src={blobUrl}
                    className="viewer-video-player"
                  />
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
                    ⬇️ Descargar archivo
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
