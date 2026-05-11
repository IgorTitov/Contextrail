/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory Seam Adapter.D adapter for the feature-seams module.
 * @sidecar memory-seam-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the memory seam adapter.
 *
 * SpecRefs: TPL-038; TPL-041
 */

import type { SeamPort } from '../ports/seam-port';

export function createMemorySeamAdapter(): SeamPort;
