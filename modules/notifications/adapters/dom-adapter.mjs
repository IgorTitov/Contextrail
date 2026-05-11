/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Dom adapter for the notifications module.
 * @sidecar dom-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx notifications
 * @public false
 * @edit careful
 */

/**
 * DOM notification adapter for browser toast display.
 * Creates an ARIA live region and manages toast lifecycle.
 *
 * @param {object} [options]
 * @param {HTMLElement} [options.container] — parent for the toast container
 * @param {string} [options.dismissLabel='Close'] — accessible label for close button
 * @returns {import('../ports/notification-port.mjs').NotificationPort & { destroy: () => void }}
 */
export function createDomNotificationAdapter(options = {}) {
  const { container = document.body, dismissLabel = 'Close' } = options;

  const region = document.createElement('div');
  region.className = 'toast-container';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'false');
  region.setAttribute('data-testid', 'toast-container');
  container.appendChild(region);

  /** @type {Map<string, { el: HTMLElement, timer?: ReturnType<typeof setTimeout> }>} */
  const activeToasts = new Map();

  return {
    show(notification) {
      const toast = document.createElement('div');
      toast.className = `toast toast--${notification.level}`;
      toast.setAttribute('data-testid', 'toast');
      toast.setAttribute('data-notification-id', notification.id);

      const msg = document.createElement('span');
      msg.className = 'toast__message';
      msg.textContent = notification.message;
      toast.appendChild(msg);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast__close';
      closeBtn.setAttribute('aria-label', dismissLabel);
      closeBtn.setAttribute('data-testid', 'toast-close');
      closeBtn.textContent = '\u00d7';
      closeBtn.addEventListener('click', () => this.dismiss(notification.id));
      toast.appendChild(closeBtn);

      region.appendChild(toast);

      const entry = { el: toast };
      if (notification.autoDismiss && notification.duration > 0) {
        entry.timer = setTimeout(() => this.dismiss(notification.id), notification.duration);
      }
      activeToasts.set(notification.id, entry);
    },

    dismiss(id) {
      const entry = activeToasts.get(id);
      if (!entry) return;
      if (entry.timer) clearTimeout(entry.timer);
      entry.el.remove();
      activeToasts.delete(id);
    },

    getActive() {
      return [...activeToasts.keys()].map((id) => {
        const el = activeToasts.get(id).el;
        return { id, element: el };
      });
    },

    destroy() {
      for (const [, entry] of activeToasts) {
        if (entry.timer) clearTimeout(entry.timer);
      }
      activeToasts.clear();
      region.remove();
    },
  };
}
