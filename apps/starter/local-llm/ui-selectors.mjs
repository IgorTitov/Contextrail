/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the bounded selector registry for the Local LLM feature, centralizing all data-testid strings used by the panel template and test code.
 * @sidecar ui-selectors.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded selector registry for the Local LLM feature.
 *
 * Usage:
 *   import { localLlm } from '../local-llm/ui-selectors.mjs';
 *   page.getByTestId(localLlm.panel);
 *
 * SpecRefs: TPL-085
 */

export const localLlm = {
  /** data-testid for the local LLM panel container */
  panel: 'local-llm-panel',

  /** data-testid for the model selector dropdown */
  modelSelector: 'local-llm-model-selector',

  /** data-testid for the load model button */
  loadButton: 'local-llm-load-button',

  /** data-testid for the progress bar container */
  progressBar: 'local-llm-progress-bar',

  /** data-testid for the progress bar fill element */
  progressFill: 'local-llm-progress-fill',

  /** data-testid for the model status indicator */
  statusIndicator: 'local-llm-status',

  /** data-testid for the storage usage display */
  storageUsage: 'local-llm-storage-usage',

  /** data-testid for the clear cache button */
  clearCacheButton: 'local-llm-clear-cache',

  /** data-testid for the capability warning message */
  capabilityWarning: 'local-llm-capability-warning',
};
