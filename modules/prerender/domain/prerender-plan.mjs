/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure prerender plan — binds a route manifest to an absolute base URL and projects render targets.
 * @sidecar prerender-plan.mjs.header.md
 * @layer domain | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { isRouteManifest } from './route-manifest.mjs';

/**
 * Pure prerender plan value object. A plan is a frozen pair of
 * `{ manifest, baseUrl }` that turns a manifest's bare paths into
 * absolute render targets. The base URL is validated once at
 * construction time — it must be an absolute http(s) URL without a
 * trailing path — so the rest of the pipeline can safely concatenate
 * `${baseUrl}${path}`.
 *
 * The plan deliberately stays I/O-free: it knows nothing about how the
 * routes will be rendered or where their HTML will be written. That
 * separation is what lets a single plan drive memory, filesystem, and
 * CDN output adapters without the domain importing any of them.
 *
 * @typedef {import('./route-manifest.mjs').RouteManifest} RouteManifest
 *
 * @typedef {object} PrerenderPlan
 * @property {Readonly<RouteManifest>} manifest
 * @property {string} baseUrl
 *
 * @typedef {object} RenderTarget
 * @property {string} path
 * @property {string} absoluteUrl
 */

/**
 * Validate and construct a frozen {@link PrerenderPlan}.
 *
 * @param {{ manifest?: unknown, baseUrl?: unknown }} input
 * @returns {Readonly<PrerenderPlan>}
 */
export function createPrerenderPlan(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('prerender.plan.invalid'));
  }
  const { manifest, baseUrl } = input;

  if (!isRouteManifest(manifest)) {
    throw new TypeError(t('prerender.plan.manifest_invalid'));
  }

  if (typeof baseUrl !== 'string') {
    throw new TypeError(t('prerender.plan.base_url_invalid'));
  }

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TypeError(t('prerender.plan.base_url_invalid'));
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(t('prerender.plan.base_url_invalid'));
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new TypeError(t('prerender.plan.base_url_invalid'));
  }
  if (parsed.search || parsed.hash) {
    throw new TypeError(t('prerender.plan.base_url_invalid'));
  }

  // Canonicalize: strip any trailing slash so concatenation is predictable.
  const canonical = `${parsed.protocol}//${parsed.host}`;

  return Object.freeze({
    manifest: /** @type {Readonly<RouteManifest>} */ (manifest),
    baseUrl: canonical,
  });
}

/**
 * Project a plan into the list of render targets the runner will walk.
 *
 * @param {Readonly<PrerenderPlan>} plan
 * @returns {ReadonlyArray<Readonly<RenderTarget>>}
 */
export function planToTargets(plan) {
  if (!plan || typeof plan !== 'object' || !Object.isFrozen(plan)) {
    throw new TypeError(t('prerender.plan.invalid'));
  }
  return Object.freeze(
    plan.manifest.routes.map((r) =>
      Object.freeze({
        path: r.path,
        absoluteUrl: `${plan.baseUrl}${r.path}`,
      }),
    ),
  );
}
