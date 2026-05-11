/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Structured output formatting and timestamp utilities shared across repository scripts.
 * @sidecar output.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

export function now() {
  return new Date().toISOString();
}

export function todayIsoDateUTC() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build a structured result object.
 *
 * Errors may be plain strings or ScriptError instances.
 * In JSON mode, ScriptError instances serialize via toJSON()
 * to provide machine-readable context alongside the message.
 * Plain strings are preserved as-is for backward compatibility.
 */
export function result(kind, ok, errors = [], warnings = [], data = {}) {
  return {
    kind,
    ok,
    generatedAt: now(),
    errors: errors.map((e) =>
      e && typeof e === 'object' && typeof e.toJSON === 'function' ? e.toJSON() : String(e),
    ),
    warnings,
    data,
  };
}
