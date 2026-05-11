/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript type declarations for webllm-adapter.mjs, including the WebLlmAdapterOptions interface and the createWebLlmAdapter factory signature.
 * @sidecar webllm-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * TypeScript sidecar for webllm-adapter.mjs.
 *
 * SpecRefs: TPL-081
 */

import type { LocalLlmPort } from '../types.js';

export interface WebLlmAdapterOptions {
  maxMessages?: number;
  /** Internal: injected loader for testing */
  _importLib?: () => Promise<any>;
  /** Internal: injected WebGPU check for testing */
  _checkWebGPU?: () => boolean;
}

export function createWebLlmAdapter(options?: WebLlmAdapterOptions): LocalLlmPort;
