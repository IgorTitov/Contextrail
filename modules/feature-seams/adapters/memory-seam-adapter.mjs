/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory Seam adapter for the feature-seams module.
 * @sidecar memory-seam-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * In-memory seam adapter. Default for all environments.
 * Wraps the domain registry directly — no persistence.
 *
 * SpecRefs: TPL-038
 *
 * @returns {import('../ports/seam-port.mjs').SeamPort}
 */

import { createSeamRegistry } from '../domain/seam-registry.mjs';

/**
 * @param {import('../domain/seam-registry.mjs').RegistryOptions} [options]
 */
export function createMemorySeamAdapter(options) {
  return createSeamRegistry(options);
}
