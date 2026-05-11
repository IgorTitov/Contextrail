/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public API surface for the openapi hex module — document builder, port, and adapters.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx openapi
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the openapi bounded module.
 * The only file other modules may import.
 */

// Domain
export { buildOpenApiDocument } from './domain/build-document.mjs';

// Ports
export { assertOpenApiDocumentPort } from './ports/openapi-document-port.mjs';

// Adapters
export { createStaticOpenApiAdapter } from './adapters/static-document-adapter.mjs';
export { createRouteRegistryOpenApiAdapter } from './adapters/route-registry-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
