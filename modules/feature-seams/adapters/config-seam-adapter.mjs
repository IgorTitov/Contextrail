/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Config Seam adapter for the feature-seams module.
 * @sidecar config-seam-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Config-driven seam adapter. Reads initial seam state from a plain object
 * (typically loaded from app-config or a JSON file). Supports runtime
 * mutations on top of the initial config.
 *
 * SpecRefs: TPL-039
 *
 * @param {Record<string, import('../domain/seam-registry.mjs').SeamConfig>} config
 * @returns {import('../ports/seam-port.mjs').SeamPort}
 */

import { createSeamRegistry } from '../domain/seam-registry.mjs';

/**
 * @param {Record<string, import('../domain/seam-registry.mjs').SeamConfig>} config
 * @param {import('../domain/seam-registry.mjs').RegistryOptions} [options]
 */
export function createConfigSeamAdapter(config, options) {
  const registry = createSeamRegistry(options);

  for (const [flag, seamConfig] of Object.entries(config)) {
    registry.register(flag, { ...seamConfig });
  }

  return registry;
}
