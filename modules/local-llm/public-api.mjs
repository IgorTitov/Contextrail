/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Expose the single permitted entry point for the local-llm module, re-exporting the port validator, adapters, and domain utilities for external consumers.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx local-llm
 * @public true
 * @edit careful
 */

/**
 * Public API for the local-llm module.
 * Only the documented surface is exported.
 *
 * SpecRefs: TPL-084
 */

export { assertLocalLlmPort } from './ports/local-llm-port.mjs';
export { createWebLlmAdapter } from './adapters/webllm-adapter.mjs';
export { createTransformersAdapter } from './adapters/transformers-adapter.mjs';
export { createModelCacheManager } from './domain/model-cache-manager.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
