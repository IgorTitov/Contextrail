/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a pure domain utility for managing browser model cache state, including built-in model registry, cache key enumeration, storage estimation, and cache deletion.
 * @sidecar model-cache-manager.mjs.header.md
 * @layer module | @hex domain | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * Model cache manager domain utility for browser storage management.
 * Manages cached LLM models in browser storage (Cache API / navigator.storage).
 *
 * SpecRefs: TPL-083
 */

import { t } from '../messages.mjs';

/**
 * Built-in model registry with known model configurations.
 *
 * @type {import('../ports/local-llm-port.mjs').LocalLlmModelConfig[]}
 */
const MODEL_REGISTRY = [
  {
    modelId: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    displayName: 'Llama 3.1 8B Instruct (4-bit)',
    sizeBytes: 4_500_000_000,
    backend: 'webllm',
    quantization: 'q4f16_1',
    contextLength: 4096,
  },
  {
    modelId: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    displayName: 'Phi 3.5 Mini Instruct (4-bit)',
    sizeBytes: 2_300_000_000,
    backend: 'webllm',
    quantization: 'q4f16_1',
    contextLength: 4096,
  },
  {
    modelId: 'gemma-2-2b-it-q4f16_1-MLC',
    displayName: 'Gemma 2 2B IT (4-bit)',
    sizeBytes: 1_500_000_000,
    backend: 'webllm',
    quantization: 'q4f16_1',
    contextLength: 2048,
  },
  {
    modelId: 'Xenova/Phi-3-mini-4k-instruct',
    displayName: 'Phi 3 Mini 4K (ONNX)',
    sizeBytes: 2_400_000_000,
    backend: 'transformers',
    contextLength: 4096,
  },
  {
    modelId: 'Xenova/distilgpt2',
    displayName: 'DistilGPT-2 (ONNX, tiny)',
    sizeBytes: 88_000_000,
    backend: 'transformers',
    contextLength: 1024,
  },
];

/**
 * @typedef {Object} ModelCacheManagerOptions
 * @property {any} [_caches] - Internal: injected Cache API for testing
 * @property {any} [_storage] - Internal: injected navigator.storage for testing
 */

/**
 * Create a model cache manager.
 *
 * @param {ModelCacheManagerOptions} [options]
 * @returns {import('../types.js').ModelCacheManager}
 */
export function createModelCacheManager(options = {}) {
  const caches =
    options._caches !== undefined
      ? options._caches
      : (typeof globalThis !== 'undefined' && globalThis.caches) || null;
  const storage =
    options._storage !== undefined
      ? options._storage
      : (typeof navigator !== 'undefined' && navigator.storage) || null;

  return {
    async getCachedModels() {
      if (!caches) return [];
      try {
        const keys = await caches.keys();
        return [...keys.map((k) => (typeof k === 'string' ? k : k.name))];
      } catch {
        return [];
      }
    },

    async isModelCached(modelId) {
      if (!caches) return false;
      try {
        const keys = await caches.keys();
        return keys.some((k) => {
          const name = typeof k === 'string' ? k : k.name;
          return name === modelId || name.includes(modelId);
        });
      } catch {
        return false;
      }
    },

    async estimateStorageUsage() {
      if (!storage) {
        return { bytesUsed: 0, bytesAvailable: 0 };
      }
      try {
        const estimate = await storage.estimate();
        return {
          bytesUsed: estimate.usage ?? 0,
          bytesAvailable: estimate.quota ?? 0,
        };
      } catch {
        return { bytesUsed: 0, bytesAvailable: 0 };
      }
    },

    async clearModelCache(modelId) {
      if (!caches) return;
      try {
        if (modelId) {
          await caches.delete(modelId);
        } else {
          const keys = await caches.keys();
          for (const key of keys) {
            const name = typeof key === 'string' ? key : key.name;
            await caches.delete(name);
          }
        }
      } catch (err) {
        throw new Error(t('local-llm.error.cache_clear_failed', { reason: err.message }), {
          cause: err,
        });
      }
    },

    getAvailableModels() {
      return [...MODEL_REGISTRY.map((m) => ({ ...m }))];
    },
  };
}
