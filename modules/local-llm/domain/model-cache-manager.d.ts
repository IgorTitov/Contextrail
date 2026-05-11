/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript type declarations for model-cache-manager.mjs, including the ModelCacheManagerOptions interface and the createModelCacheManager factory signature.
 * @sidecar model-cache-manager.d.ts.header.md
 * @layer module | @hex domain | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * TypeScript sidecar for model-cache-manager.mjs.
 *
 * SpecRefs: TPL-083
 */

import type { ModelCacheManager } from '../types.js';

export interface ModelCacheManagerOptions {
  /** Internal: injected Cache API for testing */
  _caches?: any;
  /** Internal: injected navigator.storage for testing */
  _storage?: any;
}

export function createModelCacheManager(options?: ModelCacheManagerOptions): ModelCacheManager;
