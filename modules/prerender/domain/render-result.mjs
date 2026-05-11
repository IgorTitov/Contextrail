/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure render-result value object — validated, immutable envelope for one rendered route.
 * @sidecar render-result.mjs.header.md
 * @layer domain | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure render-result value object. The canonical shape that a prerender
 * render function must return for each route: the resolved path, the
 * rendered HTML body, an HTTP-style status code (defaults to 200), and
 * an optional headers map. Keeping this a real value object — frozen,
 * validated at construction time — means the runner never has to second-
 * guess the shape produced by a user-supplied render function.
 *
 * @typedef {object} RenderResult
 * @property {string} path
 * @property {string} html
 * @property {number} status
 * @property {Readonly<Record<string, string>>} headers
 */

/**
 * Validate and construct a frozen {@link RenderResult}.
 *
 * @param {{ path?: unknown, html?: unknown, status?: unknown, headers?: unknown }} input
 * @returns {Readonly<RenderResult>}
 */
export function createRenderResult(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('prerender.result.invalid'));
  }
  const { path, html, status, headers } = input;

  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new TypeError(t('prerender.result.path_invalid'));
  }
  if (typeof html !== 'string') {
    throw new TypeError(t('prerender.result.html_invalid'));
  }

  let resolvedStatus = 200;
  if (status != null) {
    if (typeof status !== 'number' || !Number.isInteger(status) || status < 100 || status > 599) {
      throw new TypeError(t('prerender.result.status_invalid'));
    }
    resolvedStatus = status;
  }

  /** @type {Record<string, string>} */
  const resolvedHeaders = {};
  if (headers != null) {
    if (typeof headers !== 'object' || Array.isArray(headers)) {
      throw new TypeError(t('prerender.result.headers_invalid'));
    }
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (headers))) {
      resolvedHeaders[k] = String(v);
    }
  }

  return Object.freeze({
    path,
    html,
    status: resolvedStatus,
    headers: Object.freeze(resolvedHeaders),
  });
}
