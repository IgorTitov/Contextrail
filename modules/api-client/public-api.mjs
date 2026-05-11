/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Expose the single permitted entry point for the api-client module, re-exporting the port contract and fetch adapter for external consumers.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx api-client
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the api-client bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-062
 */

// Ports
export { assertApiClientPort } from './ports/api-client-port.mjs';

// Adapters
export { createFetchAdapter } from './adapters/fetch-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
