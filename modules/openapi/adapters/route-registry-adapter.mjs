/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Route registry OpenAPI adapter — builds the document lazily from a route list.
 * @sidecar route-registry-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx openapi
 * @public false
 * @edit careful
 */

import { buildOpenApiDocument } from '../domain/build-document.mjs';

/**
 * Route registry adapter — builds the OpenAPI document on first call and caches it.
 *
 * @param {import('../domain/build-document.mjs').BuilderInput} input
 * @returns {import('../ports/openapi-document-port.mjs').OpenApiDocumentPort}
 */
export function createRouteRegistryOpenApiAdapter(input) {
  /** @type {Record<string, unknown> | null} */
  let cached = null;
  return {
    getDocument() {
      if (cached === null) {
        cached = buildOpenApiDocument(input);
      }
      return cached;
    },
  };
}
