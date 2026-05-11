/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Static OpenAPI document adapter — wraps a pre-built document object.
 * @sidecar static-document-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx openapi
 * @public false
 * @edit careful
 */

/**
 * Static document adapter — returns the same document object on every call.
 * Use when the OpenAPI document is built once at startup.
 *
 * @param {Record<string, unknown>} document
 * @returns {import('../ports/openapi-document-port.mjs').OpenApiDocumentPort}
 */
export function createStaticOpenApiAdapter(document) {
  if (!document || typeof document !== 'object') {
    throw new TypeError('createStaticOpenApiAdapter requires an OpenAPI document object.');
  }
  return {
    getDocument() {
      return document;
    },
  };
}
