/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the prerender module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx prerender
 * @public true
 * @edit careful
 */

// Domain
export { createRouteManifest, isRouteManifest } from './domain/route-manifest.mjs';
export { createRenderResult } from './domain/render-result.mjs';
export { createPrerenderPlan, planToTargets } from './domain/prerender-plan.mjs';

// Ports
export { assertRenderFunction } from './ports/render-function-port.mjs';
export { assertStaticOutputPort } from './ports/static-output-port.mjs';

// Adapters
export { createMemoryStaticOutput } from './adapters/memory-static-output.mjs';
export { createSequentialPrerenderRunner } from './adapters/sequential-prerender-runner.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
