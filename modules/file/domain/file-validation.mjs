/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose File Validation domain logic for the file module.
 * @sidecar file-validation.mjs.header.md
 * @layer module | @hex domain | @ctx file
 * @public false
 * @edit careful
 */

/**
 * File validation domain logic.
 * Pure functions, no external dependencies beyond sibling domain modules.
 *
 * SpecRefs: TPL-160
 */

import { t } from '../messages.mjs';
import { getExtension, detectMimeType } from './mime-detection.mjs';

/**
 * @typedef {import('../ports/file-port.mjs').FileValidationOptions} FileValidationOptions
 */

/**
 * Validate a file against the given constraints.
 *
 * @param {{ name?: string, size?: number, type?: string }} file
 * @param {FileValidationOptions} [options]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFile(file, options = {}) {
  const errors = [];

  if (options.maxSize != null && file.size != null && file.size > options.maxSize) {
    errors.push(
      t('file.validation.too_large', {
        maxSize: options.maxSize,
        actualSize: file.size,
      }),
    );
  }

  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
    const mimeType = file.type || detectMimeType(file);
    if (!options.allowedMimeTypes.includes(mimeType)) {
      errors.push(
        t('file.validation.invalid_mime', {
          mimeType,
          allowedTypes: options.allowedMimeTypes.join(', '),
        }),
      );
    }
  }

  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const ext = getExtension(file.name || '');
    if (!ext || !options.allowedExtensions.includes(ext)) {
      errors.push(
        t('file.validation.invalid_extension', {
          extension: ext || '(none)',
          allowedExtensions: options.allowedExtensions.map((e) => `.${e}`).join(', '),
        }),
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
