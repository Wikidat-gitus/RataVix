/**
 * Utilidades para detección automática de tipos de archivos
 * Clasifica archivos por MIME Type y extensión para visualización nativa en navegador
 */

export function getFileCategory(fileName = '', mimeType = '') {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Imágenes
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  if (mimeType.startsWith('image/') || imageExts.includes(extension)) {
    return {
      type: 'image',
      icon: '🖼️',
      label: 'Imagen',
      badgeClass: 'badge-image',
      canPreviewInline: true
    };
  }

  // 2. Documentos PDF
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return {
      type: 'pdf',
      icon: '📄',
      label: 'PDF',
      badgeClass: 'badge-pdf',
      canPreviewInline: true
    };
  }

  // 3. Texto / Código / Documentos legibles
  const textExts = [
    'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'yaml', 'yml',
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'py', 'sql', 'sh',
    'env', 'log', 'ini', 'conf'
  ];
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || textExts.includes(extension)) {
    return {
      type: 'text',
      icon: '📝',
      label: extension.toUpperCase() || 'Texto',
      badgeClass: 'badge-text',
      canPreviewInline: true
    };
  }

  // 4. Audio
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
  if (mimeType.startsWith('audio/') || audioExts.includes(extension)) {
    return {
      type: 'audio',
      icon: '🎵',
      label: 'Audio',
      badgeClass: 'badge-media',
      canPreviewInline: true
    };
  }

  // 5. Video
  const videoExts = ['mp4', 'webm', 'mov', 'mkv', 'avi'];
  if (mimeType.startsWith('video/') || videoExts.includes(extension)) {
    return {
      type: 'video',
      icon: '🎬',
      label: 'Video',
      badgeClass: 'badge-media',
      canPreviewInline: true
    };
  }

  // 6. Archivos Comprimidos
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
  if (archiveExts.includes(extension) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return {
      type: 'archive',
      icon: '📦',
      label: 'Archivo',
      badgeClass: 'badge-archive',
      canPreviewInline: false
    };
  }

  // Fallback: Binario / Genérico
  return {
    type: 'binary',
    icon: '🔒',
    label: extension.toUpperCase() || 'Binario',
    badgeClass: 'badge-binary',
    canPreviewInline: false
  };
}
