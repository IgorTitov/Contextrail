/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript type declarations for local-llm-port.mjs, re-exporting LocalLlmPort and related types and declaring the assertLocalLlmPort function.
 * @sidecar local-llm-port.d.ts.header.md
 * @layer module | @hex port | @ctx local-llm
 * @public true
 * @edit careful
 */

/**
 * TypeScript sidecar for local-llm-port.mjs.
 *
 * SpecRefs: TPL-080
 */

export {
  LocalLlmProgress,
  LocalLlmModelConfig,
  LocalLlmLoadOptions,
  LocalLlmPort,
} from '../types.js';

export function assertLocalLlmPort(adapter: unknown): void;
