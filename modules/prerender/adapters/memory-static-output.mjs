/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory StaticOutputPort adapter — Map-backed store for rendered HTML keyed by path.
 * @sidecar memory-static-output.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * In-memory StaticOutputPort adapter. Backs a deterministic fake for
 * tests, local development, and the api-starter demo. Keeps the
 * rendered HTML for each route path in a `Map` and returns defensive
 * copies of the record metadata so callers cannot mutate internal
 * state.
 *
 * Exposes an adapter-specific `get(path)` helper — not part of the
 * port contract — which lets tests and the demo route read the stored
 * HTML back without having to iterate `list()`.
 *
 * @param {object} [options]
 * @param {() => number} [options.now] Clock function (defaults to Date.now).
 * @returns {import('../ports/static-output-port.mjs').StaticOutputPort & {
 *   get: (path: string) => string | null,
 * }}
 */
export function createMemoryStaticOutput(options = {}) {
  const now = options.now ?? Date.now;

  /**
   * @type {Map<string, {
   *   path: string,
   *   size: number,
   *   publishedAt: number,
   *   body: string,
   * }>}
   */
  const assets = new Map();

  /**
   * @param {{ path: string, size: number, publishedAt: number, body: string }} record
   * @returns {import('../ports/static-output-port.mjs').StaticOutputRecord}
   */
  function clone(record) {
    return Object.freeze({
      path: record.path,
      size: record.size,
      publishedAt: record.publishedAt,
    });
  }

  return {
    async write(path, html) {
      if (typeof path !== 'string' || !path.startsWith('/')) {
        throw new TypeError(t('prerender.output.write_path_invalid'));
      }
      if (typeof html !== 'string') {
        throw new TypeError(t('prerender.output.write_html_invalid'));
      }
      const record = {
        path,
        size: Buffer.byteLength(html),
        publishedAt: now(),
        body: html,
      };
      assets.set(path, record);
      return clone(record);
    },

    list() {
      return Object.freeze([...assets.values()].map(clone));
    },

    clear() {
      assets.clear();
    },

    get(path) {
      return assets.get(path)?.body ?? null;
    },
  };
}
