/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public Api.D implementation for the api-client module.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx api-client
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the api-client public API.
 *
 * SpecRefs: TPL-062; TPL-068
 */

export {
  ApiResponse,
  ApiError,
  ApiRequestOptions,
  ApiClientPort,
  assertApiClientPort,
} from './ports/api-client-port.js';

export { createFetchAdapter } from './adapters/fetch-adapter.js';
