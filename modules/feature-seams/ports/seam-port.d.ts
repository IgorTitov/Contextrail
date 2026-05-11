/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Seam Port.D port for the feature-seams module.
 * @sidecar seam-port.d.ts.header.md
 * @layer module | @hex port | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the SeamPort contract.
 *
 * SpecRefs: TPL-037; TPL-041
 */

export interface SeamConfig {
  state: 'active' | 'shadow' | 'disabled';
  owner: string;
  description?: string;
  created?: string;
}

export interface SeamEntry {
  flag: string;
  state: 'active' | 'shadow' | 'disabled';
  owner: string;
  description?: string;
  created?: string;
}

export interface SeamPort {
  isEnabled(flag: string): boolean;
  register(flag: string, config: SeamConfig): void;
  enable(flag: string): void;
  disable(flag: string): void;
  list(): SeamEntry[];
  remove(flag: string): void;
}

export function assertSeamPort(adapter: unknown): asserts adapter is SeamPort;
