/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Interpolation domain logic for the i18n module.
 * @sidecar interpolation.mjs.header.md
 * @layer module | @hex domain | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Pure string interpolation.
 * Replaces {placeholder} tokens with values from a params object.
 */

/**
 * @param {string} template - e.g. "Hello, {name}!"
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function interpolate(template, params = {}) {
  if (!template || typeof template !== 'string') return template ?? '';
  if (!params || typeof params !== 'object') return template;

  return Object.entries(params).reduce(
    (str, [key, value]) => str.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
