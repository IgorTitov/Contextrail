/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Guards domain logic for the feature-seams module.
 * @sidecar guards.mjs.header.md
 * @layer module | @hex domain | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Guard helpers for branching on feature seam state.
 * These are the primary API for conditional code paths.
 *
 * SpecRefs: TPL-040
 */

/**
 * Branch based on seam state: if enabled, run newPath; otherwise run oldPath.
 *
 * @template T
 * @param {import('../ports/seam-port.mjs').SeamPort} seamPort
 * @param {string} flag
 * @param {() => T} newPath - Called when the seam is active
 * @param {() => T} oldPath - Called when the seam is disabled, shadow, or unknown
 * @returns {T}
 */
export function whenEnabled(seamPort, flag, newPath, oldPath) {
  return seamPort.isEnabled(flag) ? newPath() : oldPath();
}

/**
 * Run an action only if the seam is enabled. No-op otherwise.
 *
 * @param {import('../ports/seam-port.mjs').SeamPort} seamPort
 * @param {string} flag
 * @param {() => void} action
 */
export function ifEnabled(seamPort, flag, action) {
  if (seamPort.isEnabled(flag)) {
    action();
  }
}

/**
 * @typedef {Object} ShadowOptions
 * @property {(oldResult: *, newResult: *) => boolean} [compare] - Return true if results match
 * @property {(flag: string, oldResult: *, newResult: *) => void} [onDivergence] - Called when results differ
 * @property {(flag: string, error: Error) => void} [onError] - Called when newPath throws
 * @property {{ record: (diverged: boolean) => boolean }} [tracker] - Divergence tracker for auto-disable
 */

/**
 * Shadow-mode guard: run both paths, return old-path result.
 * If the seam is not in shadow state, falls back to whenEnabled behavior.
 *
 * When `options.tracker` is provided and reports a threshold breach,
 * the seam is auto-disabled via `seamPort.disable(flag)`.
 *
 * @template T
 * @param {import('../ports/seam-port.mjs').SeamPort} seamPort
 * @param {string} flag
 * @param {() => T} newPath
 * @param {() => T} oldPath
 * @param {ShadowOptions} [options]
 * @returns {T}
 */
export function whenShadow(seamPort, flag, newPath, oldPath, options = {}) {
  if (seamPort.isShadow(flag)) {
    const oldResult = oldPath();
    let diverged = false;
    try {
      const newResult = newPath();
      const compare = options.compare ?? ((a, b) => a === b);
      diverged = !compare(oldResult, newResult);
      if (diverged && options.onDivergence) {
        options.onDivergence(flag, oldResult, newResult);
      }
    } catch (err) {
      diverged = true;
      if (options.onError) {
        options.onError(flag, err instanceof Error ? err : new Error(String(err)));
      }
    }
    if (options.tracker && options.tracker.record(diverged)) {
      seamPort.disable(flag);
    }
    return oldResult;
  }
  return seamPort.isEnabled(flag) ? newPath() : oldPath();
}
