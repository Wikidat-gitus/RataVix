/**
 * Utilidades para detección automática de tipos de archivos
 * Clasifica archivos por MIME Type y extensión para visualización nativa e iconografía
 */

export function getFileCategory(fileName = '', mimeType = '') {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Videos (MP4, WebM, MKV, AVI, etc.)
  const videoExts = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'm4v'];
  if (mimeType.startsWith('video/') || videoExts.includes(extension)) {
    return {
      type: 'video',
      icon: '🎬',
      label: 'Video',
      badgeClass: 'badge-media',
      canPreviewInline: true
    };
  }

  // 2. Audio (MP3, WAV, FLAC, M4A, etc.)
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'];
  if (mimeType.startsWith('audio/') || audioExts.includes(extension)) {
    return {
      type: 'audio',
      icon: '🎵',
      label: 'Audio',
      badgeClass: 'badge-media',
      canPreviewInline: true
    };
  }

  // 3. Imágenes (PNG, JPG, SVG, WebP, GIF, etc.)
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'psd'];
  if (mimeType.startsWith('image/') || imageExts.includes(extension)) {
    return {
      type: 'image',
      icon: '🖼️',
      label: 'Imagen',
      badgeClass: 'badge-image',
      canPreviewInline: true
    };
  }

  // 4. Documentos PDF
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return {
      type: 'pdf',
      icon: '📄',
      label: 'PDF',
      badgeClass: 'badge-pdf',
      canPreviewInline: true
    };
  }

  // 5. Ofimática: Hojas de Cálculo (Excel, CSV, ODS)
  const excelExts = ['xls', 'xlsx', 'ods', 'csv', 'tsv'];
  if (excelExts.includes(extension) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return {
      type: 'spreadsheet',
      icon: '📊',
      label: extension === 'csv' ? 'CSV' : 'Excel',
      badgeClass: 'badge-spreadsheet',
      canPreviewInline: false
    };
  }

  // 6. Ofimática: Documentos Word / Texto con formato
  const wordExts = ['doc', 'docx', 'odt', 'rtf'];
  if (wordExts.includes(extension) || mimeType.includes('word') || mimeType.includes('document')) {
    return {
      type: 'document',
      icon: '📘',
      label: 'Word',
      badgeClass: 'badge-word',
      canPreviewInline: false
    };
  }

  // 7. Ofimática: Presentaciones (PowerPoint)
  const pptExts = ['ppt', 'pptx', 'odp'];
  if (pptExts.includes(extension) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return {
      type: 'presentation',
      icon: '📑',
      label: 'PowerPoint',
      badgeClass: 'badge-presentation',
      canPreviewInline: false
    };
  }

  // 8. Código Fuente / Scripts
  const codeExts = [
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'py', 'sql', 'sh',
    'json', 'xml', 'yaml', 'yml', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'rs', 'go'
  ];
  if (codeExts.includes(extension)) {
    return {
      type: 'text',
      icon: '💻',
      label: extension.toUpperCase() || 'Código',
      badgeClass: 'badge-code',
      canPreviewInline: true
    };
  }

  // 9. Texto plano / Notas legibles
  const textExts = ['txt', 'md', 'markdown', 'log', 'ini', 'conf', 'env'];
  if (mimeType.startsWith('text/') || textExts.includes(extension)) {
    return {
      type: 'text',
      icon: '📝',
      label: 'Texto',
      badgeClass: 'badge-text',
      canPreviewInline: true
    };
  }

  // 10. Archivos Comprimidos / Paquetes
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'xz'];
  if (archiveExts.includes(extension) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return {
      type: 'archive',
      icon: '📦',
      label: 'Comprimido',
      badgeClass: 'badge-archive',
      canPreviewInline: false
    };
  }

  // 11. Ejecutables / Instaladores
  const exeExts = ['exe', 'msi', 'apk', 'dmg', 'pkg', 'deb', 'rpm'];
  if (exeExts.includes(extension)) {
    return {
      type: 'executable',
      icon: '⚙️',
      label: 'Ejecutable',
      badgeClass: 'badge-archive',
      canPreviewInline: false
    };
  }

  // 12. Fallback: Archivo General / Otro Formato
  return {
    type: 'general',
    icon: '📄',
    label: extension ? extension.toUpperCase() : 'General',
    badgeClass: 'badge-general',
    canPreviewInline: false
  };
}
