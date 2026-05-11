/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the file module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx file
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the file module.
 * All user-facing copy from file adapters flows through this layer.
 *
 * SpecRefs: TPL-160, TPL-161, TPL-162
 */

const locales = {
  en: {
    'file.port.must_be_object': 'FilePort adapter must be a non-null object.',
    'file.port.missing_method': 'FilePort adapter must implement {method}().',
    'file.validation.too_large':
      'File exceeds maximum size of {maxSize} bytes (actual: {actualSize} bytes).',
    'file.validation.invalid_mime':
      'MIME type "{mimeType}" is not allowed. Allowed types: {allowedTypes}.',
    'file.validation.invalid_extension':
      'Extension ".{extension}" is not allowed. Allowed extensions: {allowedExtensions}.',
    'file.upload.failed': 'File upload failed: {reason}.',
    'file.download.failed': 'File download failed: {reason}.',
    'file.read.failed': 'File read failed: {reason}.',
    'file.fs.browser_unsupported': 'FileSystemAdapter is not available in browser environments.',
    'file.fs.base_path_required': 'FileSystemAdapter requires a basePath option.',
    'file.fs.not_found': 'File not found: {path}.',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  currentLocale = locale;
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key];
  if (template == null) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

/**
 * @param {string} locale
 * @param {Record<string, string>} messages
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
