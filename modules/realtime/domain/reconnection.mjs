/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Reconnection domain logic for the realtime module.
 * @sidecar reconnection.mjs.header.md
 * @layer module | @hex domain | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Exponential backoff reconnection strategy with jitter.
 * Pure domain logic — no external dependencies.
 *
 * SpecRefs: TPL-148
 */

/**
 * @typedef {object} ReconnectionOptions
 * @property {number} [baseDelay=1000]
 * @property {number} [multiplier=2]
 * @property {number} [maxDelay=30000]
 * @property {boolean} [jitter=true]
 * @property {number} [maxAttempts=Infinity]
 */

/**
 * @typedef {object} ReconnectionStrategy
 * @property {() => number} nextDelay — returns the delay for the next attempt, advances the counter
 * @property {() => void} reset — resets attempt counter
 * @property {number} attempt — current attempt number (read-only getter)
 */

/**
 * Create an exponential backoff reconnection strategy.
 *
 * @param {ReconnectionOptions} [options]
 * @returns {ReconnectionStrategy}
 */
export function createReconnectionStrategy(options = {}) {
  const {
    baseDelay = 1000,
    multiplier = 2,
    maxDelay = 30000,
    jitter = true,
    maxAttempts: _maxAttempts = Infinity,
  } = options;

  let attempt = 0;

  return {
    get attempt() {
      return attempt;
    },

    nextDelay() {
      attempt += 1;
      const exponential = baseDelay * Math.pow(multiplier, attempt - 1);
      const clamped = Math.min(exponential, maxDelay);
      if (jitter) {
        return Math.floor(clamped * (0.5 + Math.random() * 0.5));
      }
      return clamped;
    },

    reset() {
      attempt = 0;
    },
  };
}
