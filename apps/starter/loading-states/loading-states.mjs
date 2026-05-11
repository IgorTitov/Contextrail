/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Loading States for the starter app.
 * @sidecar loading-states.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Loading state helpers.
 * Pure DOM manipulation — no framework dependency.
 */

import { t } from '../messages.mjs';
import { loading } from './ui-selectors.mjs';

/**
 * Mark an element as loading (sets aria-busy and adds a spinner).
 *
 * @param {HTMLElement} element
 * @param {object} [options]
 * @param {boolean} [options.overlay=false] — add a full overlay with spinner
 */
export function showLoading(element, options = {}) {
  element.setAttribute('aria-busy', 'true');

  if (options.overlay) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.setAttribute('data-testid', loading.overlay);

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('data-testid', loading.spinner);
    spinner.setAttribute('role', 'status');

    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = t('loading.sr-only');
    spinner.appendChild(srText);

    overlay.appendChild(spinner);
    element.style.position = element.style.position || 'relative';
    element.appendChild(overlay);
  }
}

/**
 * Remove loading state from an element.
 *
 * @param {HTMLElement} element
 */
export function hideLoading(element) {
  element.removeAttribute('aria-busy');
  const overlay = element.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

/**
 * Create a skeleton placeholder element.
 *
 * @param {'text' | 'heading' | 'avatar' | 'block'} [shape='text']
 * @returns {HTMLDivElement}
 */
export function createSkeleton(shape = 'text') {
  const el = document.createElement('div');
  el.className = `skeleton skeleton--${shape}`;
  el.setAttribute('data-testid', loading.skeleton);
  el.setAttribute('aria-hidden', 'true');
  return el;
}
