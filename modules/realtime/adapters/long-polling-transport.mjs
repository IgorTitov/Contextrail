/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Long Polling Transport adapter for the realtime module.
 * @sidecar long-polling-transport.mjs.header.md
 * @layer module | @hex adapter | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Long-polling transport adapter.
 * Implements TransportPort using native fetch for both directions.
 *
 * SpecRefs: TPL-151
 *
 * @param {object} [options]
 * @param {string} [options.pollEndpoint] — URL for GET-based polling
 * @param {string} [options.sendEndpoint] — URL for POST-based send
 * @param {number} [options.timeout=30000] — timeout per poll request in ms
 * @param {number} [options.retryDelay=1000] — delay between poll cycles on error
 * @returns {import('../ports/transport-port.mjs').TransportPort}
 */
export function createLongPollingTransport(options = {}) {
  const {
    pollEndpoint: defaultPollEndpoint,
    sendEndpoint: defaultSendEndpoint,
    timeout = 30000,
    retryDelay = 1000,
  } = options;

  /** @type {string} */
  let state = 'disconnected';
  /** @type {Array<(data: unknown) => void>} */
  const messageListeners = [];
  /** @type {Array<(state: string) => void>} */
  const stateListeners = [];
  /** @type {AbortController | null} */
  let abortController = null;
  /** @type {string} */
  let pollUrl = defaultPollEndpoint || '';
  /** @type {string} */
  let sendUrl = defaultSendEndpoint || '';
  /** @type {boolean} */
  let polling = false;

  /**
   * @param {string} newState
   */
  function setState(newState) {
    state = newState;
    for (const cb of stateListeners) {
      cb(state);
    }
  }

  /**
   * Internal polling loop.
   */
  async function pollLoop() {
    polling = true;
    while (polling && state === 'connected') {
      try {
        abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          if (abortController) abortController.abort();
        }, timeout);

        const response = await fetch(pollUrl, {
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!polling) break;

        if (response.ok) {
          const data = await response.json();
          for (const cb of messageListeners) {
            cb(data);
          }
        }

        // Yield the event loop between polls to prevent busy-looping
        // when the server responds instantly (common in tests and fast servers).
        await new Promise((r) => setTimeout(r, 0));
      } catch (_err) {
        if (!polling) break;
        // On error, wait before retrying
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
    polling = false;
  }

  return {
    isSupported() {
      return typeof fetch !== 'undefined';
    },

    getState() {
      return state;
    },

    /**
     * @param {string} url — base URL; used as pollEndpoint if not separately configured
     * @param {object} [openOptions]
     * @param {string} [openOptions.pollEndpoint]
     * @param {string} [openOptions.sendEndpoint]
     */
    open(url, openOptions = {}) {
      return new Promise((resolve, reject) => {
        pollUrl = openOptions.pollEndpoint || url;
        sendUrl = openOptions.sendEndpoint || defaultSendEndpoint || url;
        setState('connecting');

        // Validate reachability with an initial poll
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        fetch(pollUrl, { signal: controller.signal })
          .then((res) => {
            clearTimeout(timeoutId);
            if (res.ok) {
              setState('connected');
              // Start the long-polling loop
              pollLoop();
              resolve();
            } else {
              setState('failed');
              reject(new Error(`Long-polling connection failed: HTTP ${res.status}`));
            }
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            setState('failed');
            reject(err);
          });
      });
    },

    close() {
      return new Promise((resolve) => {
        polling = false;
        if (abortController) {
          abortController.abort();
          abortController = null;
        }
        setState('disconnected');
        resolve();
      });
    },

    send(data) {
      if (state !== 'connected') {
        throw new Error('Cannot send data while not connected.');
      }
      fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    onMessage(callback) {
      messageListeners.push(callback);
    },

    onStateChange(callback) {
      stateListeners.push(callback);
    },
  };
}
