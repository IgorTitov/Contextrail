/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Mouse Collector domain logic for the analytics module.
 * @sidecar mouse-collector.mjs.header.md
 * @layer module | @hex domain | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Mouse movement heatmap data collector.
 * Samples mouse position at configurable intervals, batches, and flushes.
 * Consent-gated under 'behavioral' category.
 */

/**
 * @typedef {object} MouseSample
 * @property {number} x
 * @property {number} y
 * @property {number} viewportWidth
 * @property {number} viewportHeight
 * @property {number} timestamp
 */

/**
 * @typedef {object} MouseCollectorOptions
 * @property {number} [sampleInterval] - Minimum interval between samples in ms. Default: 100.
 * @property {(samples: MouseSample[]) => void} [flushFn] - Called when batch is full.
 * @property {number} [batchSize] - Number of samples before flushing. Default: 50.
 */

/**
 * Create a mouse movement collector for heatmap data.
 *
 * @param {MouseCollectorOptions} [options]
 */
export function createMouseCollector(options = {}) {
  const sampleInterval = options.sampleInterval ?? 100;
  const flushFn = options.flushFn ?? (() => {});
  const batchSize = options.batchSize ?? 50;

  /** @type {MouseSample[]} */
  let batch = [];
  let running = false;
  let lastSampleTime = 0;
  let focusMultiplier = 1;

  /** @type {((e: MouseEvent) => void) | null} */
  let mousemoveHandler = null;
  /** @type {(() => void) | null} */
  let visibilityHandler = null;

  /**
   * Handle mousemove events. Throttled by sampleInterval and focusMultiplier.
   * @param {MouseEvent} e
   */
  function onMouseMove(e) {
    if (!running) return;
    const now = Date.now();
    const effectiveInterval = sampleInterval * focusMultiplier;
    if (now - lastSampleTime < effectiveInterval) return;

    lastSampleTime = now;

    /** @type {MouseSample} */
    const sample = {
      x: e.clientX,
      y: e.clientY,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
      timestamp: now,
    };

    batch.push(sample);

    if (batch.length >= batchSize) {
      const toFlush = batch;
      batch = [];
      flushFn(toFlush);
    }
  }

  /**
   * Adapt sampling rate based on page visibility.
   */
  function onVisibilityChange() {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      focusMultiplier = 4; // Reduce rate when page not focused
    } else {
      focusMultiplier = 1;
    }
  }

  return {
    /**
     * Start collecting mouse movement data.
     * Requires document to be available.
     */
    start() {
      if (running) return;
      if (typeof document === 'undefined') return;
      running = true;
      lastSampleTime = 0;
      focusMultiplier = 1;

      mousemoveHandler = onMouseMove;
      document.addEventListener('mousemove', mousemoveHandler, { passive: true });

      visibilityHandler = onVisibilityChange;
      document.addEventListener('visibilitychange', visibilityHandler);
    },

    /**
     * Stop collecting. Does not flush remaining samples.
     */
    stop() {
      if (!running) return;
      running = false;
      if (typeof document !== 'undefined') {
        if (mousemoveHandler) {
          document.removeEventListener('mousemove', mousemoveHandler);
        }
        if (visibilityHandler) {
          document.removeEventListener('visibilitychange', visibilityHandler);
        }
      }
      mousemoveHandler = null;
      visibilityHandler = null;
    },

    /**
     * Stop and clean up internal state, flushing any remaining samples.
     */
    destroy() {
      this.stop();
      if (batch.length > 0) {
        const toFlush = batch;
        batch = [];
        flushFn(toFlush);
      }
    },

    /**
     * Get the current number of pending samples (for testing).
     * @returns {number}
     */
    getPendingCount() {
      return batch.length;
    },
  };
}
