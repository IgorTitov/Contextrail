/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure route manifest value object — a validated, immutable list of prerender routes.
 * @sidecar route-manifest.mjs.header.md
 * @layer domain | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure route manifest value object. Holds a frozen, deduplicated list of
 * `{ path, title?, meta? }` route descriptors — the list of URLs the
 * prerender runner will walk over. The manifest is intentionally ignorant
 * of rendering, HTTP transport, and output sinks; it only answers the
 * question "which routes should be prerendered?".
 *
 * Every `path` must be a string that starts with `/` and must be unique
 * within the manifest. Duplicates fail fast at construction time rather
 * than producing silent overwrites downstream.
 *
 * @typedef {object} RouteDescriptor
 * @property {string} path
 * @property {string} [title]
 * @property {Record<string, unknown>} [meta]
 *
 * @typedef {object} RouteManifest
 * @property {ReadonlyArray<Readonly<RouteDescriptor>>} routes
 */

/**
 * Validate and construct a frozen {@link RouteManifest}.
 *
 * @param {{ routes?: Array<unknown> }} input
 * @returns {Readonly<RouteManifest>}
 */
export function createRouteManifest(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('prerender.manifest.invalid'));
  }
  const raw = /** @type {{ routes?: unknown }} */ (input).routes;
  if (!Array.isArray(raw)) {
    throw new TypeError(t('prerender.manifest.routes_not_array'));
  }

  /** @type {Array<Readonly<RouteDescriptor>>} */
  const routes = [];
  const seen = new Set();

  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new TypeError(t('prerender.manifest.route_not_object', { index }));
    }
    const r = /** @type {Record<string, unknown>} */ (entry);
    const path = r.path;
    if (typeof path !== 'string' || !path.startsWith('/')) {
      throw new TypeError(t('prerender.manifest.route_path_invalid', { index }));
    }
    if (seen.has(path)) {
      throw new TypeError(t('prerender.manifest.duplicate_path', { path }));
    }
    seen.add(path);

    /** @type {RouteDescriptor} */
    const descriptor = { path };

    if (r.title != null) {
      if (typeof r.title !== 'string') {
        throw new TypeError(t('prerender.manifest.route_title_invalid', { path }));
      }
      descriptor.title = r.title;
    }
    if (r.meta != null) {
      if (typeof r.meta !== 'object' || Array.isArray(r.meta)) {
        throw new TypeError(t('prerender.manifest.route_meta_invalid', { path }));
      }
      descriptor.meta = Object.freeze({ .../** @type {Record<string, unknown>} */ (r.meta) });
    }

    routes.push(Object.freeze(descriptor));
  });

  return Object.freeze({ routes: Object.freeze(routes) });
}

/**
 * Brand check — does this value look like a manifest produced by
 * {@link createRouteManifest}? Used by the plan builder so callers get a
 * precise error instead of a stack trace from deep inside a loop.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRouteManifest(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.isFrozen(value) &&
    Array.isArray(/** @type {RouteManifest} */ (value).routes) &&
    Object.isFrozen(/** @type {RouteManifest} */ (value).routes)
  );
}
