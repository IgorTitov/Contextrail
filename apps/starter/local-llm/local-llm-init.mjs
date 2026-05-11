/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Wire the Local LLM panel into the starter app container, selecting the appropriate adapter factory based on model backend and exposing the loaded adapter via onAdapterReady.
 * @sidecar local-llm-init.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Local LLM initialization for the starter app.
 * Wires the local LLM panel into the starter app using feature-seams
 * for adapter swap (echo -> local-llm).
 *
 * SpecRefs: TPL-085
 */

import {
  createWebLlmAdapter,
  createTransformersAdapter,
  createModelCacheManager,
} from '../../../modules/local-llm/public-api.mjs';
import { createLocalLlmPanel } from './local-llm-panel.mjs';

/**
 * Initialize the Local LLM feature inside a container element.
 *
 * @param {HTMLElement} container
 * @param {object} [options]
 * @param {(adapter: import('../../../modules/local-llm/public-api.mjs').LocalLlmPort) => void} [options.onAdapterReady] - called when a local LLM adapter is loaded and ready
 * @returns {{ destroy: () => void }}
 */
export function initLocalLlm(container, options = {}) {
  const cacheManager = createModelCacheManager();

  const checkWebGPU = () => typeof navigator !== 'undefined' && 'gpu' in navigator;
  const checkWasm = () => typeof WebAssembly !== 'undefined';

  /**
   * Create the appropriate adapter based on model config backend.
   *
   * @param {import('../../../modules/local-llm/public-api.mjs').LocalLlmModelConfig} modelConfig
   * @returns {import('../../../modules/local-llm/public-api.mjs').LocalLlmPort}
   */
  function createAdapter(modelConfig) {
    if (modelConfig.backend === 'webllm') {
      return createWebLlmAdapter();
    }
    return createTransformersAdapter();
  }

  const {
    element,
    destroy: destroyPanel,
    getAdapter,
  } = createLocalLlmPanel({
    cacheManager,
    createAdapter,
    checkWebGPU,
    checkWasm,
    onModelReady: () => {
      const adapter = getAdapter();
      if (adapter && options.onAdapterReady) {
        options.onAdapterReady(adapter);
      }
    },
  });

  container.appendChild(element);

  return {
    destroy() {
      destroyPanel();
      element.remove();
    },
  };
}
