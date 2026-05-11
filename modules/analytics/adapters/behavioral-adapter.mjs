/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Behavioral adapter for the analytics module.
 * @sidecar behavioral-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Behavioral analytics adapter.
 * Wraps another AnalyticsPort to add click, scroll, and visibility tracking.
 * All behavioral events are gated under the 'behavioral' consent category.
 * Off by default; must call startTracking() to activate.
 */

import { isConsentGranted } from '../domain/consent.mjs';

/**
 * @typedef {object} BehavioralAdapterOptions
 * @property {number[]} [scrollThresholds] - Scroll depth thresholds to report. Default: [25, 50, 75, 100].
 * @property {number} [clickDebounceMs] - Debounce for click events. Default: 100.
 * @property {number} [visibilityThreshold] - IntersectionObserver threshold. Default: 0.5.
 * @property {number} [scrollDebounceMs] - Debounce for scroll handler. Default: 250.
 */

/**
 * Create a behavioral analytics adapter that wraps an inner AnalyticsPort.
 *
 * @param {import('../ports/analytics-port.mjs').AnalyticsPort} innerPort
 * @param {BehavioralAdapterOptions} [options]
 */
export function createBehavioralAdapter(innerPort, options = {}) {
  const scrollThresholds = options.scrollThresholds ?? [25, 50, 75, 100];
  const clickDebounceMs = options.clickDebounceMs ?? 100;
  const visibilityThreshold = options.visibilityThreshold ?? 0.5;
  const scrollDebounceMs = options.scrollDebounceMs ?? 250;

  let tracking = false;

  // Click tracking state
  let lastClickTime = 0;
  /** @type {((e: Event) => void) | null} */
  let clickHandler = null;

  // Scroll tracking state
  /** @type {Set<number>} */
  const reportedThresholds = new Set();
  /** @type {number | null} */
  let scrollTimer = null;
  /** @type {(() => void) | null} */
  let scrollHandler = null;

  // Visibility tracking state
  /** @type {IntersectionObserver | null} */
  let observer = null;
  /** @type {Map<Element, number>} */
  const visibilityStartTimes = new Map();

  /**
   * Check if behavioral consent is granted on the inner port.
   * @returns {boolean}
   */
  function hasBehavioralConsent() {
    return isConsentGranted(innerPort.getConsent(), 'behavioral');
  }

  /**
   * Handle click events via event delegation.
   * @param {Event} e
   */
  function onDocumentClick(e) {
    if (!tracking || !hasBehavioralConsent()) return;
    const now = Date.now();
    if (now - lastClickTime < clickDebounceMs) return;
    lastClickTime = now;

    const target = /** @type {Element} */ (e.target);
    if (!target || typeof target.tagName !== 'string') return;

    const classes = target.className
      ? String(target.className).split(/\s+/).slice(0, 3).join(' ')
      : '';

    const mouseEvent = /** @type {MouseEvent} */ (e);
    innerPort.track('behavior:click', {
      tagName: target.tagName,
      id: target.id || undefined,
      className: classes || undefined,
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      timestamp: now,
    });
  }

  /**
   * Compute the current scroll depth percentage.
   * @returns {number}
   */
  function getScrollDepth() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
    const scrollTop = window.scrollY || 0;
    const docHeight = document.documentElement.scrollHeight || 1;
    const viewportHeight = window.innerHeight || 0;
    const maxScroll = docHeight - viewportHeight;
    if (maxScroll <= 0) return 100;
    return Math.min(100, Math.round((scrollTop / maxScroll) * 100));
  }

  /**
   * Handle scroll events with debouncing.
   */
  function onScroll() {
    if (!tracking || !hasBehavioralConsent()) return;
    if (scrollTimer !== null) {
      clearTimeout(scrollTimer);
    }
    scrollTimer = setTimeout(() => {
      const depth = getScrollDepth();
      for (const threshold of scrollThresholds) {
        if (depth >= threshold && !reportedThresholds.has(threshold)) {
          reportedThresholds.add(threshold);
          innerPort.track('behavior:scroll', { depth: threshold });
        }
      }
    }, scrollDebounceMs);
  }

  /**
   * Create an IntersectionObserver for visibility tracking if available.
   */
  function createObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
    observer = new IntersectionObserver(
      (entries) => {
        if (!tracking || !hasBehavioralConsent()) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibilityStartTimes.set(entry.target, Date.now());
          } else if (visibilityStartTimes.has(entry.target)) {
            const startTime = visibilityStartTimes.get(entry.target);
            visibilityStartTimes.delete(entry.target);
            const timeInViewMs = Date.now() - startTime;
            innerPort.track('behavior:visibility', {
              element: entry.target.tagName + (entry.target.id ? `#${entry.target.id}` : ''),
              timeInViewMs,
            });
          }
        }
      },
      { threshold: visibilityThreshold },
    );
  }

  return {
    /**
     * Start all behavioral tracking collectors.
     */
    startTracking() {
      if (tracking) return;
      tracking = true;

      // Click tracking via event delegation
      if (typeof document !== 'undefined' && document.body) {
        clickHandler = onDocumentClick;
        document.body.addEventListener('click', clickHandler, { passive: true });
      }

      // Scroll depth tracking
      if (typeof window !== 'undefined') {
        reportedThresholds.clear();
        scrollHandler = onScroll;
        window.addEventListener('scroll', scrollHandler, { passive: true });
      }

      // Element visibility tracking
      createObserver();
    },

    /**
     * Stop all behavioral tracking and remove listeners.
     */
    stopTracking() {
      if (!tracking) return;
      tracking = false;

      if (typeof document !== 'undefined' && clickHandler) {
        document.body.removeEventListener('click', clickHandler);
        clickHandler = null;
      }

      if (typeof window !== 'undefined' && scrollHandler) {
        window.removeEventListener('scroll', scrollHandler);
        scrollHandler = null;
      }

      if (scrollTimer !== null) {
        clearTimeout(scrollTimer);
        scrollTimer = null;
      }

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      visibilityStartTimes.clear();
    },

    /**
     * Observe an element for visibility tracking.
     * @param {Element} element
     */
    observe(element) {
      if (observer) {
        observer.observe(element);
      }
    },

    /**
     * Stop observing an element.
     * @param {Element} element
     */
    unobserve(element) {
      if (observer) {
        observer.unobserve(element);
        visibilityStartTimes.delete(element);
      }
    },

    /**
     * Stop tracking and clean up all internal state.
     */
    destroy() {
      this.stopTracking();
      reportedThresholds.clear();
    },

    /**
     * Whether tracking is currently active (for testing).
     * @returns {boolean}
     */
    isTracking() {
      return tracking;
    },
  };
}
