/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Heartbeat domain logic for the realtime module.
 * @sidecar heartbeat.mjs.header.md
 * @layer module | @hex domain | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Heartbeat / keep-alive detector for realtime connections.
 * Pure domain logic — uses only timers.
 *
 * SpecRefs: TPL-148
 */

/**
 * @typedef {object} HeartbeatOptions
 * @property {number} [interval=30000] — ms between pings
 * @property {number} [timeout=10000]  — ms to wait for pong before timeout fires
 */

/**
 * @typedef {object} Heartbeat
 * @property {(sendFn: () => void, onTimeout: () => void) => void} start
 * @property {() => void} stop
 * @property {() => void} receivedPong
 */

/**
 * Create a heartbeat monitor.
 *
 * @param {HeartbeatOptions} [options]
 * @returns {Heartbeat}
 */
export function createHeartbeat(options = {}) {
  const { interval = 30000, timeout = 10000 } = options;

  /** @type {ReturnType<typeof setInterval> | null} */
  let pingTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timeoutTimer = null;

  /** @type {(() => void) | null} */
  let _onTimeout = null;

  function clearTimers() {
    if (pingTimer !== null) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  }

  function startTimeoutTimer() {
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
    }
    timeoutTimer = setTimeout(() => {
      if (_onTimeout) _onTimeout();
    }, timeout);
  }

  return {
    /**
     * Start sending periodic heartbeats.
     * @param {() => void} sendFn — called each interval to send a ping
     * @param {() => void} onTimeout — called if no pong within timeout
     */
    start(sendFn, onTimeout) {
      clearTimers();
      _onTimeout = onTimeout;
      pingTimer = setInterval(() => {
        sendFn();
        startTimeoutTimer();
      }, interval);
    },

    /** Stop all heartbeat timers. */
    stop() {
      clearTimers();
      _onTimeout = null;
    },

    /** Signal that a pong was received — resets the timeout timer. */
    receivedPong() {
      if (timeoutTimer !== null) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    },
  };
}
