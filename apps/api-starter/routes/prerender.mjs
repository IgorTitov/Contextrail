/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prerender demo route — runs a sequential prerender over a small route manifest using an inline render function that calls back into the host router.
 * @sidecar prerender.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * Prerender demo route — exercises the prerender module's public API
 * against a tiny hardcoded manifest covering three live routes that
 * already exist in the api-starter router: the JSON health probe, the
 * greeting route, and the root openapi document. The inline render
 * function wraps each of those handlers so we prove the runner can
 * walk a plan whose render function delegates back into the app's own
 * router and returns HTML that wraps the JSON response.
 *
 * Real SSG deployments swap the render function for one backed by a
 * template engine or framework SSR, and swap the StaticOutputPort for
 * one that writes to the local filesystem or a CDN. The pure domain
 * and the sequential runner stay the same.
 *
 * GET  /api/prerender/run           → { rendered, failed, durationMs }
 * GET  /api/prerender/output?path=/ → { path, html } or 404
 */

import {
  createRouteManifest,
  createPrerenderPlan,
} from '../../../modules/prerender/public-api.mjs';

const DEMO_MANIFEST = createRouteManifest({
  routes: [
    { path: '/health', title: 'Health probe' },
    { path: '/api/greet?name=World', title: 'Greeting demo' },
    { path: '/openapi.json', title: 'OpenAPI document' },
  ],
});

const DEMO_PLAN = createPrerenderPlan({
  manifest: DEMO_MANIFEST,
  baseUrl: 'https://example.com',
});

/**
 * Build a render function that delegates to the host router's own
 * handlers. For each manifest path we look up a matching route, invoke
 * its handler with a synthetic request, and wrap the JSON result in
 * minimal HTML. Missing routes return a 404-style envelope so the
 * runner records a failure (with the path) but keeps going.
 *
 * @param {ReturnType<typeof import('../app.mjs').createAppContext>} ctx
 * @param {Array<{ method: string, path: string, handler: Function }>} routes
 */
function createDemoRenderFn(ctx, routes) {
  return async function renderFn(path) {
    // Split off any query string the manifest used (we want to pretend
    // the prerender output includes a pre-warmed greeting for `World`).
    const [routePath, rawQuery] = path.split('?');
    const route = routes.find((r) => r.method === 'GET' && r.path === routePath);
    if (!route) {
      throw new Error(`prerender demo: no GET route matches "${routePath}"`);
    }
    const query = new URLSearchParams(rawQuery ?? '');
    const req = { query, method: 'GET', pathname: routePath };
    const result = await route.handler(req, ctx);
    const body =
      result && typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${path}</title></head>
<body><pre>${escapeHtml(body)}</pre></body>
</html>`;
    return { html };
  };
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Route handler: run the demo prerender and return its summary.
 *
 * @param {{ query: URLSearchParams }} _req
 * @param {ReturnType<typeof import('../app.mjs').createAppContext> & {
 *   prerenderRunner: { run: (plan: unknown) => Promise<unknown> },
 *   prerenderOutput: { clear: () => void, list: () => unknown[] },
 *   prerenderRoutes: Array<{ method: string, path: string, handler: Function }>,
 * }} ctx
 */
export async function prerenderRunHandler(_req, ctx) {
  ctx.prerenderOutput.clear();
  const renderFn = createDemoRenderFn(ctx, ctx.prerenderRoutes);
  // Rebuild the runner per request with the ad-hoc renderFn so the
  // context always sees fresh handlers — this matches how a real CI
  // static build would run from a cold process each time.
  const { createSequentialPrerenderRunner } =
    await import('../../../modules/prerender/public-api.mjs');
  const runner = createSequentialPrerenderRunner({
    renderFn,
    output: ctx.prerenderOutput,
  });
  const summary = await runner.run(DEMO_PLAN);
  return {
    baseUrl: DEMO_PLAN.baseUrl,
    rendered: summary.rendered,
    failed: summary.failed,
    durationMs: summary.durationMs,
    stored: ctx.prerenderOutput.list().length,
  };
}

/**
 * Route handler: read one stored HTML body by path (from the most
 * recent /api/prerender/run call).
 *
 * @param {{ query: URLSearchParams }} req
 * @param {{ prerenderOutput: { get: (path: string) => string | null } }} ctx
 */
export async function prerenderOutputHandler(req, ctx) {
  const path = req.query.get('path');
  if (!path) {
    return { error: 'missing "path" query parameter' };
  }
  const html = ctx.prerenderOutput.get(path);
  if (html == null) {
    return { error: 'no stored output for that path', path };
  }
  return { path, html };
}

export { DEMO_MANIFEST, DEMO_PLAN };
