/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the example-greeter bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx example-greeter
 * @public true
 * @edit careful
 */

export { greet } from './domain/greeter.mjs';
export { assertGreetingPort } from './ports/greeting-port.mjs';
export { defaultGreetingAdapter } from './adapters/default-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
