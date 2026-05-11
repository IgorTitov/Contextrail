/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Guards.D implementation for the feature-seams module.
 * @sidecar guards.d.ts.header.md
 * @layer module | @hex domain | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Type definitions for feature seam guard helpers.
 *
 * SpecRefs: TPL-040; TPL-041
 */

import type { SeamPort } from '../ports/seam-port';

export function whenEnabled<T>(
  seamPort: SeamPort,
  flag: string,
  newPath: () => T,
  oldPath: () => T,
): T;

export function ifEnabled(
  seamPort: SeamPort,
  flag: string,
  action: () => void,
): void;
