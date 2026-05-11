/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Sliding-window divergence counter for shadow mode auto-disable.
 * @sidecar divergence-tracker.mjs.header.md
 * @layer module | @hex domain | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Sliding-window counter that tracks divergence rate in shadow mode.
 * Pure domain logic, zero dependencies.
 *
 * @param {{ maxDivergence: number, windowSize?: number }} config
 * @returns {{ record: (diverged: boolean) => boolean }}
 */
export function createDivergenceTracker({ maxDivergence, windowSize = 20 }) {
  /** @type {boolean[]} */
  const window = [];

  return {
    /**
     * Record a shadow execution result.
     * @param {boolean} diverged - true if old and new paths produced different results
     * @returns {boolean} true if threshold is breached (auto-disable should trigger)
     */
    record(diverged) {
      window.push(diverged);
      if (window.length > windowSize) {
        window.shift();
      }
      const count = window.filter(Boolean).length;
      return count >= maxDivergence;
    },
  };
}
