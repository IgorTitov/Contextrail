/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define the ApiClientPort contract that all HTTP client adapters must satisfy, plus the shared ApiRequest, ApiResponse, and ApiError types.
 * @sidecar api-client-port.mjs.header.md
 * @layer module | @hex port | @ctx api-client
 * @public true
 * @edit careful
 */

/**
 * Port contract for API client adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-068
 *
 * @typedef {Object} ApiResponse
 * @property {number} status
 * @property {any} data
 * @property {Record<string, string>} headers
 * @property {boolean} ok
 *
 * @typedef {Object} ApiError
 * @property {number} status
 * @property {any} data
 * @property {Record<string, string>} headers
 * @property {boolean} ok
 * @property {string} message - i18n message key
 *
 * @typedef {Object} ApiRequestOptions
 * @property {Record<string, string>} [headers]
 * @property {Record<string, string | number>} [params]
 * @property {number} [timeout]
 *
 * @typedef {Object} ApiClientPort
 * @property {(url: string, options?: ApiRequestOptions) => Promise<ApiResponse>} get
 * @property {(url: string, body?: any, options?: ApiRequestOptions) => Promise<ApiResponse>} post
 * @property {(url: string, body?: any, options?: ApiRequestOptions) => Promise<ApiResponse>} put
 * @property {(url: string, options?: ApiRequestOptions) => Promise<ApiResponse>} delete
 * @property {(url: string) => void} setBaseUrl
 * @property {(name: string, value: string) => void} setHeader
 * @property {(name: string) => void} removeHeader
 */

const REQUIRED_METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'setBaseUrl',
  'setHeader',
  'removeHeader',
];

/**
 * Validate that an adapter conforms to the ApiClientPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertApiClientPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('ApiClientPort adapter must be a non-null object');
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(`ApiClientPort adapter must implement ${method}()`);
    }
  }
}
