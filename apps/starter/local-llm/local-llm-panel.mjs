/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the Local LLM panel component for the starter app: model selection, loading progress display, status indicator, storage usage, and cache management, framework-free vanilla JS.
 * @sidecar local-llm-panel.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Local LLM panel component for the starter app.
 * Provides model selection, loading progress, status, and cache management.
 * Framework-free vanilla JS.
 *
 * SpecRefs: TPL-085
 */

import { localLlm } from './ui-selectors.mjs';
import { t } from './messages.mjs';

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

/**
 * @typedef {Object} LocalLlmPanelOptions
 * @property {import('../../../modules/local-llm/public-api.mjs').ModelCacheManager} cacheManager
 * @property {(modelConfig: import('../../../modules/local-llm/public-api.mjs').LocalLlmModelConfig) => import('../../../modules/local-llm/public-api.mjs').LocalLlmPort} createAdapter
 * @property {() => boolean} checkWebGPU
 * @property {() => boolean} checkWasm
 * @property {() => void} [onModelReady] - called when a model finishes loading
 * @property {() => void} [onDestroy]
 */

/**
 * Create the Local LLM panel component.
 *
 * @param {LocalLlmPanelOptions} options
 * @returns {{ element: HTMLElement, destroy: () => void, getAdapter: () => import('../../../modules/local-llm/public-api.mjs').LocalLlmPort | null }}
 */
export function createLocalLlmPanel(options) {
  const { cacheManager, createAdapter, checkWebGPU, checkWasm } = options;
  const hasWebGPU = checkWebGPU();
  const hasWasm = checkWasm();
  const hasCapability = hasWebGPU || hasWasm;

  /** @type {import('../../../modules/local-llm/public-api.mjs').LocalLlmPort | null} */
  let currentAdapter = null;

  // Root panel
  const panel = document.createElement('div');
  panel.className = 'local-llm-panel';
  panel.setAttribute('data-testid', localLlm.panel);

  // If no capability, show warning
  if (!hasCapability) {
    const warning = document.createElement('p');
    warning.className = 'local-llm-capability-warning';
    warning.setAttribute('data-testid', localLlm.capabilityWarning);
    warning.textContent = t('local-llm.ui.capability_warning');
    panel.appendChild(warning);
    return {
      element: panel,
      destroy() {},
      getAdapter() {
        return null;
      },
    };
  }

  // Model selector
  const selectorRow = document.createElement('div');
  selectorRow.className = 'local-llm-selector-row';

  const select = document.createElement('select');
  select.className = 'local-llm-model-selector';
  select.setAttribute('data-testid', localLlm.modelSelector);

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = t('local-llm.ui.select_model');
  select.appendChild(defaultOption);

  const models = cacheManager.getAvailableModels();
  for (const model of models) {
    // Filter by available backend
    if (model.backend === 'webllm' && !hasWebGPU) continue;
    if (model.backend === 'transformers' && !hasWasm) continue;

    const opt = document.createElement('option');
    opt.value = model.modelId;
    opt.textContent = `${model.displayName} (${formatBytes(model.sizeBytes)})`;
    select.appendChild(opt);
  }

  selectorRow.appendChild(select);

  // Load button
  const loadButton = document.createElement('button');
  loadButton.className = 'local-llm-load-button';
  loadButton.setAttribute('data-testid', localLlm.loadButton);
  loadButton.textContent = t('local-llm.ui.load_model');
  loadButton.disabled = true;
  selectorRow.appendChild(loadButton);

  panel.appendChild(selectorRow);

  // Status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'local-llm-status';
  statusIndicator.setAttribute('data-testid', localLlm.statusIndicator);
  statusIndicator.textContent = t('local-llm.ui.status.not_loaded');
  panel.appendChild(statusIndicator);

  // Progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'local-llm-progress-bar';
  progressBar.setAttribute('data-testid', localLlm.progressBar);
  progressBar.style.display = 'none';

  const progressFill = document.createElement('div');
  progressFill.className = 'local-llm-progress-fill';
  progressFill.setAttribute('data-testid', localLlm.progressFill);
  progressBar.appendChild(progressFill);
  panel.appendChild(progressBar);

  // Storage usage
  const storageUsage = document.createElement('div');
  storageUsage.className = 'local-llm-storage-usage';
  storageUsage.setAttribute('data-testid', localLlm.storageUsage);
  panel.appendChild(storageUsage);

  // Clear cache button
  const clearCacheButton = document.createElement('button');
  clearCacheButton.className = 'local-llm-clear-cache';
  clearCacheButton.setAttribute('data-testid', localLlm.clearCacheButton);
  clearCacheButton.textContent = t('local-llm.ui.clear_cache');
  panel.appendChild(clearCacheButton);

  // --- Event handlers ---

  select.addEventListener('change', () => {
    loadButton.disabled = !select.value;
  });

  /** Update storage display */
  async function refreshStorage() {
    try {
      const usage = await cacheManager.estimateStorageUsage();
      storageUsage.textContent = t('local-llm.ui.storage', {
        used: formatBytes(usage.bytesUsed),
        available: formatBytes(usage.bytesAvailable),
      });
    } catch {
      storageUsage.textContent = '';
    }
  }

  loadButton.addEventListener('click', async () => {
    const modelId = select.value;
    if (!modelId) return;

    const modelConfig = models.find((m) => m.modelId === modelId);
    if (!modelConfig) return;

    // Unload previous model
    if (currentAdapter) {
      await currentAdapter.unloadModel();
      currentAdapter = null;
    }

    currentAdapter = createAdapter(modelConfig);

    // Show progress
    progressBar.style.display = '';
    progressFill.style.width = '0%';
    loadButton.disabled = true;
    select.disabled = true;
    statusIndicator.textContent = t('local-llm.ui.status.downloading');

    try {
      await currentAdapter.loadModel(modelId, {
        onProgress: (progress) => {
          const percent = Math.round(progress.progress * 100);
          progressFill.style.width = `${percent}%`;

          if (progress.stage === 'downloading') {
            statusIndicator.textContent = t('local-llm.ui.status.downloading');
          } else if (progress.stage === 'initializing') {
            statusIndicator.textContent = t('local-llm.ui.status.initializing');
          } else if (progress.stage === 'ready') {
            statusIndicator.textContent = t('local-llm.ui.status.ready');
          }
        },
      });

      statusIndicator.textContent = t('local-llm.ui.status.ready');
      loadButton.textContent = t('local-llm.ui.unload_model');
      loadButton.disabled = false;
      progressBar.style.display = 'none';

      if (options.onModelReady) {
        options.onModelReady();
      }
    } catch (_err) {
      statusIndicator.textContent = t('local-llm.ui.status.error');
      currentAdapter = null;
      loadButton.disabled = false;
    }

    select.disabled = false;
    refreshStorage();
  });

  clearCacheButton.addEventListener('click', async () => {
    await cacheManager.clearModelCache();
    refreshStorage();
  });

  // Initial storage refresh
  refreshStorage();

  return {
    element: panel,
    destroy() {
      if (currentAdapter && currentAdapter.isModelLoaded()) {
        currentAdapter.unloadModel();
      }
      currentAdapter = null;
      if (options.onDestroy) options.onDestroy();
    },
    getAdapter() {
      return currentAdapter;
    },
  };
}
