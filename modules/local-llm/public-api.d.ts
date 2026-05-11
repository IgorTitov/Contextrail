/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript type declarations for the local-llm public API, re-exporting all adapter factories, the port validator, and all public types from the module.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx local-llm
 * @public true
 * @edit careful
 */

/**
 * TypeScript sidecar for the local-llm public API.
 *
 * SpecRefs: TPL-084
 */

export { assertLocalLlmPort } from './ports/local-llm-port.js';
export { createWebLlmAdapter } from './adapters/webllm-adapter.js';
export { createTransformersAdapter } from './adapters/transformers-adapter.js';
export { createModelCacheManager } from './domain/model-cache-manager.js';

export type {
  LocalLlmPort,
  LocalLlmProgress,
  LocalLlmModelConfig,
  LocalLlmLoadOptions,
  ModelCacheStorageEstimate,
  ModelCacheManager,
  AiChatMessage,
  AiChatResponse,
  AiChatOptions,
  AiChatStreamChunk,
} from './types.js';
