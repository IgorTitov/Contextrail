/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose OpenAPI document provider port — contract for adapters that supply an OpenAPI 3 document.
 * @sidecar openapi-document-port.mjs.header.md
 * @layer module | @hex port | @ctx openapi
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract — any OpenAPI document provider must satisfy this shape.
 *
 * @typedef {object} OpenApiDocumentPort
 * @property {() => Record<string, unknown>} getDocument — returns the OpenAPI 3 document object
 */

const REQUIRED_METHODS = ['getDocument'];

/**
 * Validate that an adapter conforms to the OpenApiDocumentPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertOpenApiDocumentPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('openapi.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('openapi.port.missing_method', { method }));
    }
  }
}
