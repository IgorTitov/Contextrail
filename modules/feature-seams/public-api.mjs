/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the feature-seams bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx feature-seams
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the feature-seams bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-036
 */

// Domain
export { SEAM_STATES } from './domain/seam-registry.mjs';
export { whenEnabled, ifEnabled, whenShadow } from './domain/guards.mjs';
export { createDivergenceTracker } from './domain/divergence-tracker.mjs';

// Ports
export { assertSeamPort } from './ports/seam-port.mjs';
export { assertHealthPort } from './ports/health-port.mjs';

// Adapters
export { createMemorySeamAdapter } from './adapters/memory-seam-adapter.mjs';
export { createConfigSeamAdapter } from './adapters/config-seam-adapter.mjs';
export { createHealthAdapter } from './adapters/health-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
