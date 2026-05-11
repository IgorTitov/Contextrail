/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory GraphqlTransportPort adapter — wraps the pure parser + executor for tests and dev.
 * @sidecar memory-graphql-transport.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx graphql
 * @public false
 * @edit careful
 */

import { parseQuery } from '../domain/query-parser.mjs';
import { executeQuery } from '../domain/executor.mjs';

/**
 * In-memory GraphqlTransportPort adapter. Synchronously wraps the pure
 * parser and executor — parse errors and execution errors are both
 * returned in the canonical `{ data, errors }` result shape so callers
 * get a single consistent contract regardless of where the failure
 * happened.
 *
 * @param {{ schema: import('../domain/schema.mjs').Schema }} options
 * @returns {import('../ports/graphql-transport-port.mjs').GraphqlTransportPort}
 */
export function createMemoryGraphqlTransport(options) {
  const { schema } = options;
  return {
    async handleQuery(rawQuery, context) {
      try {
        const ast = parseQuery(rawQuery);
        return executeQuery(schema, ast, context);
      } catch (err) {
        return {
          data: null,
          errors: [
            {
              message: err instanceof Error ? err.message : String(err),
              path: [],
            },
          ],
        };
      }
    },
  };
}
