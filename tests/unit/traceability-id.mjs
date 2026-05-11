/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Tiny pure helper used by the template’s unit-test example.
 * @sidecar traceability-id.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

export function normalizeTraceabilityId(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}
