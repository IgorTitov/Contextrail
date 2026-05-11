/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the rate-limit module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx rate-limit
 * @public true
 * @edit careful
 */

// Domain
export { createBucketState, consume, refill, validateBucketConfig } from './domain/rate-limit.mjs';

// Ports
export { assertRateLimiterPort } from './ports/rate-limit-port.mjs';

// Adapters
export { createMemoryRateLimiter } from './adapters/default-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
