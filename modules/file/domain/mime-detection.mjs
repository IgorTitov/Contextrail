/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Mime Detection domain logic for the file module.
 * @sidecar mime-detection.mjs.header.md
 * @layer module | @hex domain | @ctx file
 * @public false
 * @edit careful
 */

/**
 * MIME type detection from file extensions.
 * Pure domain logic, no external dependencies.
 *
 * SpecRefs: TPL-160
 */

/** @type {Record<string, string>} */
export const MIME_TYPES = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',

  // Documents
  pdf: 'application/pdf',
  txt: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  md: 'text/markdown',

  // Archives
  zip: 'application/zip',
  gz: 'application/gzip',

  // Audio/Video
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

/**
 * Extract the extension from a filename.
 *
 * @param {string} filename
 * @returns {string} The extension without the leading dot, or empty string if none.
 */
export function getExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Detect the MIME type of a file based on its name or extension.
 *
 * @param {{ name?: string } | string} file - A File-like object with a name property, or a filename string.
 * @returns {string} The detected MIME type, or 'application/octet-stream' if unknown.
 */
export function detectMimeType(file) {
  const name = typeof file === 'string' ? file : file?.name;
  const ext = getExtension(name || '');
  return MIME_TYPES[ext] || 'application/octet-stream';
}
