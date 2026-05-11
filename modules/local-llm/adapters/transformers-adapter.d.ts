/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript type declarations for transformers-adapter.mjs, including the TransformersAdapterOptions interface and the createTransformersAdapter factory signature.
 * @sidecar transformers-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * TypeScript sidecar for transformers-adapter.mjs.
 *
 * SpecRefs: TPL-082
 */

import type { LocalLlmPort } from '../types.js';

export interface TransformersAdapterOptions {
  maxMessages?: number;
  /** Internal: injected loader for testing */
  _importLib?: () => Promise<any>;
  /** Internal: injected WASM check for testing */
  _checkWasm?: () => boolean;
}

export function createTransformersAdapter(options?: TransformersAdapterOptions): LocalLlmPort;
