/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Sse Transport adapter for the realtime module.
 * @sidecar sse-transport.mjs.header.md
 * @layer module | @hex adapter | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Server-Sent Events transport adapter.
 * Implements TransportPort using native EventSource for receiving
 * and fetch POST for sending.
 *
 * SpecRefs: TPL-150
 *
 * @param {object} [options]
 * @param {string} [options.sendEndpoint] — URL for POST-based send
 * @returns {import('../ports/transport-port.mjs').TransportPort}
 */
export function createSseTransport(options = {}) {
  const { sendEndpoint } = options;

  /** @type {EventSource | null} */
  let source = null;
  /** @type {string} */
  let state = 'disconnected';
  /** @type {Array<(data: unknown) => void>} */
  const messageListeners = [];
  /** @type {Array<(state: string) => void>} */
  const stateListeners = [];
  /** @type {string} */
  let currentSendEndpoint = sendEndpoint || '';

  /**
   * @param {string} newState
   */
  function setState(newState) {
    state = newState;
    for (const cb of stateListeners) {
      cb(state);
    }
  }

  return {
    isSupported() {
      return typeof EventSource !== 'undefined';
    },

    getState() {
      return state;
    },

    /**
     * @param {string} url — EventSource URL
     * @param {object} [openOptions]
     * @param {string} [openOptions.sendEndpoint] — overrides constructor option
     * @param {boolean} [openOptions.withCredentials]
     */
    open(url, openOptions = {}) {
      return new Promise((resolve, reject) => {
        setState('connecting');
        if (openOptions.sendEndpoint) {
          currentSendEndpoint = openOptions.sendEndpoint;
        }
        try {
          source = new EventSource(url, {
            withCredentials: openOptions.withCredentials || false,
          });
        } catch (err) {
          setState('failed');
          reject(err);
          return;
        }

        source.onopen = () => {
          setState('connected');
          resolve();
        };

        source.onmessage = (event) => {
          for (const cb of messageListeners) {
            cb(event.data);
          }
        };

        source.onerror = () => {
          if (state === 'connecting') {
            setState('failed');
            reject(new Error('SSE connection failed'));
          } else {
            setState('disconnected');
          }
        };
      });
    },

    close() {
      return new Promise((resolve) => {
        if (source) {
          source.close();
          source = null;
        }
        setState('disconnected');
        resolve();
      });
    },

    send(data) {
      if (state !== 'connected') {
        throw new Error('Cannot send data while not connected.');
      }
      if (!currentSendEndpoint) {
        throw new Error('No sendEndpoint configured for SSE transport.');
      }
      // Fire-and-forget POST; callers who need confirmation can await the returned promise
      fetch(currentSendEndpoint, {
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
