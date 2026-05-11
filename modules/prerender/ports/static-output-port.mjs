/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for static output adapters — write, list, and clear rendered HTML by path.
 * @sidecar static-output-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for static output adapters. Adapters own where the
 * rendered HTML actually lives — in-memory `Map` for tests, the local
 * filesystem for a CI static build, an S3/CDN upload for an edge
 * deployment, etc. The pure domain never imports any of those; it just
 * calls `output.write(path, html)` per route and trusts the adapter to
 * persist the bytes.
 *
 * `write` takes the route path (e.g. `/about`) plus the rendered HTML
 * body. `list` returns a snapshot record of every stored asset so
 * callers and tests can introspect the output without touching adapter
 * internals. `clear` wipes all state — useful between test runs or
 * before a full re-render.
 *
 * @typedef {object} StaticOutputRecord
 * @property {string} path
 * @property {number} size          Byte length of the stored HTML.
 * @property {number} publishedAt   Epoch ms the asset was (re)published.
 *
 * @typedef {object} StaticOutputPort
 * @property {(path: string, html: string) => Promise<StaticOutputRecord>} write
 * @property {() => ReadonlyArray<StaticOutputRecord>} list
 * @property {() => void} clear
 */

const REQUIRED = [
  ['write', 'prerender.output.missing_write'],
  ['list', 'prerender.output.missing_list'],
  ['clear', 'prerender.output.missing_clear'],
];

/**
 * Validate that an adapter conforms to the {@link StaticOutputPort}
 * contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertStaticOutputPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('prerender.output.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
