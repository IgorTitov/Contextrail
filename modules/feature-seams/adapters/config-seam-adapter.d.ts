/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Config Seam Adapter.D adapter for the feature-seams module.
 * @sidecar config-seam-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the config-driven seam adapter.
 *
 * SpecRefs: TPL-039; TPL-041
 */

import type { SeamConfig, SeamPort } from '../ports/seam-port';

export function createConfigSeamAdapter(
  config: Record<string, SeamConfig>,
): SeamPort;
