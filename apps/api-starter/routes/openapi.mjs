/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose OpenAPI document route handler for the api-starter API.
 * @sidecar openapi.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * OpenAPI route — returns the OpenAPI 3 document for this API.
 *
 * GET /openapi.json → application/json OpenAPI 3.0.3 document
 *
 * The document is provided by ctx.openapi, an OpenApiDocumentPort wired in
 * app.mjs from the route registry. Tools like Swagger UI, Redoc, or
 * openapi-generator can consume the response directly.
 *
 * @param {object} _req — unused
 * @param {object} ctx — app context with wired adapters
 * @returns {Record<string, unknown>}
 */
export function openapiHandler(_req, ctx) {
  return ctx.openapi.getDocument();
}
