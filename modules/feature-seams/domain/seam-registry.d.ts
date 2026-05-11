/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Seam Registry.D implementation for the feature-seams module.
 * @sidecar seam-registry.d.ts.header.md
 * @layer module | @hex domain | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Type definitions for seam registry domain logic.
 *
 * SpecRefs: TPL-037; TPL-041
 */

import type { SeamConfig, SeamEntry, SeamPort } from '../ports/seam-port';

export { SeamConfig, SeamEntry };

export const SEAM_STATES: Readonly<{
  ACTIVE: 'active';
  SHADOW: 'shadow';
  DISABLED: 'disabled';
}>;

export function createSeamRegistry(): SeamPort;
