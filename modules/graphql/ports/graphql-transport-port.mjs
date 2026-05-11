/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for GraphQL transport adapters — parse + execute + format one raw query string.
 * @sidecar graphql-transport-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx graphql
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for GraphQL transport adapters. Adapters own the
 * transport layer (HTTP POST body, WebSocket frame, IPC message, etc.)
 * and call the pure parser + executor under the hood. Keeping the
 * transport behind a port means the domain never imports a server
 * framework.
 *
 * `handleQuery` takes a raw query string and an opaque context object,
 * and returns the canonical GraphQL result shape `{ data, errors }`.
 *
 * @typedef {import('../domain/executor.mjs').ExecutionResult} ExecutionResult
 *
 * @typedef {object} GraphqlTransportPort
 * @property {(rawQuery: string, context?: unknown) => Promise<ExecutionResult>} handleQuery
 */

const REQUIRED = [['handleQuery', 'graphql.transport.missing_handleQuery']];

/**
 * Validate that an adapter conforms to the GraphqlTransportPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertGraphqlTransportPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('graphql.transport.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
