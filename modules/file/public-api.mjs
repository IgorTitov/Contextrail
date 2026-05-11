/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the file bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx file
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the file bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-160, TPL-161, TPL-162
 */

// Ports
export { assertFilePort } from './ports/file-port.mjs';

// Domain — MIME detection
export { detectMimeType, getExtension, MIME_TYPES } from './domain/mime-detection.mjs';

// Domain — validation
export { validateFile } from './domain/file-validation.mjs';

// Domain — utilities
export { formatFileSize, generateFileId } from './domain/file-utils.mjs';

// Adapters
export { createBlobAdapter } from './adapters/blob-adapter.mjs';
export { createFileSystemAdapter } from './adapters/file-system-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
