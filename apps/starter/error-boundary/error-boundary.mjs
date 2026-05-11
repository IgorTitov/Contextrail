/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Error Boundary for the starter app.
 * @sidecar error-boundary.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Error boundary / fallback UI pattern.
 * Global error handler with user-friendly recovery UI.
 */

import { t } from '../messages.mjs';
import { errorBoundary } from './ui-selectors.mjs';

/**
 * Render a fallback UI inside a container.
 *
 * @param {HTMLElement} container — element to replace content with fallback
 * @param {object} [options]
 * @param {() => void} [options.onRetry] — custom retry action (defaults to page reload)
 * @returns {{ retryButton: HTMLButtonElement }}
 */
export function renderFallback(container, options = {}) {
  const { onRetry } = options;

  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'error-fallback';
  wrapper.setAttribute('data-testid', errorBoundary.container);
  wrapper.setAttribute('role', 'alert');

  const title = document.createElement('h2');
  title.className = 'error-fallback__title';
  title.setAttribute('data-testid', errorBoundary.title);
  title.textContent = t('error.title');
  wrapper.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'error-fallback__description';
  desc.textContent = t('error.description');
  wrapper.appendChild(desc);

  const retryButton = document.createElement('button');
  retryButton.className = 'error-fallback__retry';
  retryButton.setAttribute('data-testid', errorBoundary.retryButton);
  retryButton.setAttribute('type', 'button');
  retryButton.textContent = t('error.retry');
  retryButton.addEventListener('click', () => {
    if (onRetry) {
      onRetry();
    } else {
      location.reload();
    }
  });
  wrapper.appendChild(retryButton);

  container.appendChild(wrapper);

  return { retryButton };
}

/**
 * Install a global error boundary.
 * Catches unhandled errors/rejections and renders fallback UI.
 *
 * @param {HTMLElement} rootElement — the element whose content gets replaced on error
 * @param {object} [options]
 * @param {(error: Error) => void} [options.onError] — optional error callback (e.g. send to notifications)
 * @param {() => void} [options.onRetry] — custom retry action
 * @returns {{ uninstall: () => void }}
 */
export function installErrorBoundary(rootElement, options = {}) {
  const { onError, onRetry } = options;

  function handleError(error) {
    console.error('[error-boundary]', error);
    if (onError) onError(error);
    renderFallback(rootElement, { onRetry });
  }

  function onWindowError(event) {
    handleError(event.error || new Error(event.message));
  }

  function onUnhandledRejection(event) {
    handleError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  }

  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return {
    uninstall() {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    },
  };
}

/**
 * Wrap an async function with error boundary handling.
 *
 * @param {() => Promise<void>} fn
 * @param {(error: Error) => void} errorHandler
 * @returns {() => Promise<void>}
 */
export function wrapAsync(fn, errorHandler) {
  return async () => {
    try {
      await fn();
    } catch (error) {
      errorHandler(error instanceof Error ? error : new Error(String(error)));
    }
  };
}
