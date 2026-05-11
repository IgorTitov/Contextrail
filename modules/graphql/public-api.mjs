/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the graphql module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx graphql
 * @public true
 * @edit careful
 */

// Domain
export { createSchema, stripTypeDecoration, isBuiltinScalar } from './domain/schema.mjs';
export { parseQuery } from './domain/query-parser.mjs';
export { executeQuery } from './domain/executor.mjs';

// Ports
export { assertGraphqlTransportPort } from './ports/graphql-transport-port.mjs';

// Adapters
export { createMemoryGraphqlTransport } from './adapters/memory-graphql-transport.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
