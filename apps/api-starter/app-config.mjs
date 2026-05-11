/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Configuration management for the api-starter application.
 * @sidecar app-config.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * API starter app configuration.
 * Server-side equivalent of apps/starter/app-config.mjs.
 *
 * Resolves environment-based configuration for the server app shell.
 */

/**
 * Server environment modes.
 * @readonly
 * @enum {string}
 */
export const MODES = Object.freeze({
  development: 'development',
  production: 'production',
  test: 'test',
});

/** @type {string} */
let currentMode = MODES.development;

/**
 * Detect the server mode from environment variables.
 * @returns {string}
 */
export function detectMode() {
  const env = typeof process !== 'undefined' ? process.env.NODE_ENV : undefined;
  if (env === 'production') return MODES.production;
  if (env === 'test') return MODES.test;
  return MODES.development;
}

/** @returns {string} */
export function getMode() {
  return currentMode;
}

/** @param {string} mode */
export function setMode(mode) {
  if (!Object.values(MODES).includes(mode)) {
    throw new Error(`Unknown server mode: ${mode}`);
  }
  currentMode = mode;
}

/**
 * Resolve the server configuration.
 * @returns {{ mode: string, port: number, host: string, rateLimit: { capacity: number, refillPerSecond: number }, email: { mode: 'memory' | 'console', from: string } }}
 */
export function resolveConfig() {
  currentMode = detectMode();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  const rateLimit = {
    capacity: parseInt(process.env.RATE_LIMIT_CAPACITY || '60', 10),
    refillPerSecond: parseFloat(process.env.RATE_LIMIT_REFILL_PER_SECOND || '30'),
  };
  const email = {
    mode: /** @type {'memory' | 'console'} */ (
      process.env.EMAIL_MODE === 'console' ? 'console' : 'memory'
    ),
    from: process.env.EMAIL_FROM || 'hello@api-starter.local',
  };
  return { mode: currentMode, port, host, rateLimit, email };
}

export function resetConfig() {
  currentMode = MODES.development;
}
