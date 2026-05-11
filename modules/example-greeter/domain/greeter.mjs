/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure domain logic for greeting — framework-free, no external dependencies.
 * @sidecar greeter.mjs.header.md
 * @layer module | @hex domain | @ctx example-greeter
 * @public false
 * @edit careful
 */

/**
 * Format a greeting using a template string.
 *
 * @param {string} name     The name to greet.
 * @param {string} template A template with `{name}` placeholder.
 * @returns {string} The formatted greeting.
 */
export function greet(name, template) {
  if (!name) return '';
  return template.replace('{name}', name);
}
