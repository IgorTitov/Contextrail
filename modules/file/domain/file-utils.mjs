/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose File Utils domain logic for the file module.
 * @sidecar file-utils.mjs.header.md
 * @layer module | @hex domain | @ctx file
 * @public false
 * @edit careful
 */

/**
 * General file utility functions.
 * Pure domain logic, no external dependencies.
 *
 * SpecRefs: TPL-160
 */

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Format a byte count into a human-readable string.
 *
 * @param {number} bytes
 * @returns {string} e.g. '1.2 MB', '340 KB', '5 B'
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} B`;
  }

  // Show decimal only when meaningful
  const formatted = size % 1 === 0 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${SIZE_UNITS[unitIndex]}`;
}

let idCounter = 0;

/**
 * Generate a unique file tracking ID.
 *
 * @returns {string}
 */
export function generateFileId() {
  return `file-${Date.now()}-${++idCounter}`;
}

/**
 * Reset the internal ID counter. Useful in tests.
 */
export function resetFileIdCounter() {
  idCounter = 0;
}
