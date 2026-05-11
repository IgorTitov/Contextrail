/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port typedef for prerender render functions — (path, context) => Promise<{ html, status?, headers? }>.
 * @sidecar render-function-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Typedef-only port for prerender render functions. Unlike a struct port
 * with several methods, a "render function" is a single callable: the
 * caller owns the rendering strategy (template engine, React/Vue SSR,
 * a plain string builder, or — as in api-starter — invoking the host's
 * own router). The runner only needs to know that it can `await fn(path,
 * context)` and get back a `{ html, status?, headers? }` envelope.
 *
 * Keeping this as a bare function rather than a wrapped object keeps the
 * adoption cost for new adapters near zero while still letting the
 * runner assert the shape at wiring time via {@link assertRenderFunction}.
 *
 * @typedef {{ html: string, status?: number, headers?: Record<string, string> }} RenderFunctionResult
 *
 * @typedef {(path: string, context?: unknown) => (RenderFunctionResult | Promise<RenderFunctionResult>)} RenderFunctionPort
 */

/**
 * Validate that a value conforms to the {@link RenderFunctionPort}
 * contract — i.e. it is a function. Shape-of-result validation happens
 * at result construction time via `createRenderResult`.
 *
 * @param {unknown} fn
 * @throws {TypeError} If the value is not a function.
 */
export function assertRenderFunction(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError(t('prerender.render_fn.not_function'));
  }
}
