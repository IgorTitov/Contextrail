/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Jitter domain logic for the scheduler module.
 * @sidecar jitter.mjs.header.md
 * @layer module | @hex domain | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Jitter utility for interval randomization.
 * Pure domain logic, framework-free.
 */

/**
 * Add random jitter to an interval.
 * Result is always >= 1 (never negative or zero).
 *
 * @param {number} interval - Base interval in ms
 * @param {number} jitterRange - Maximum jitter deviation in ms
 * @returns {number} Adjusted interval
 */
export function addJitter(interval, jitterRange) {
  const offset = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(1, Math.round(interval + offset));
}
