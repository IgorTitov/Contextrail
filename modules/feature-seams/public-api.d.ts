/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public Api.D implementation for the feature-seams module.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the feature-seams public API.
 *
 * SpecRefs: TPL-036; TPL-041
 */

export type { SeamPort, SeamConfig, SeamEntry } from './ports/seam-port';
export { assertSeamPort } from './ports/seam-port';
export { SEAM_STATES } from './domain/seam-registry';
export { whenEnabled, ifEnabled } from './domain/guards';
export { createMemorySeamAdapter } from './adapters/memory-seam-adapter';
export { createConfigSeamAdapter } from './adapters/config-seam-adapter';
