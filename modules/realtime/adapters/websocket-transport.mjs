/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Websocket Transport adapter for the realtime module.
 * @sidecar websocket-transport.mjs.header.md
 * @layer module | @hex adapter | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * WebSocket transport adapter.
 * Implements TransportPort using the native WebSocket API.
 *
 * SpecRefs: TPL-149
 *
 * @returns {import('../ports/transport-port.mjs').TransportPort}
 */
export function createWebSocketTransport() {
  /** @type {WebSocket | null} */
  let ws = null;
  /** @type {string} */
  let state = 'disconnected';
  /** @type {Array<(data: unknown) => void>} */
  const messageListeners = [];
  /** @type {Array<(state: string) => void>} */
  const stateListeners = [];

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
      return typeof WebSocket !== 'undefined';
    },

    getState() {
      return state;
    },

    /**
     * @param {string} url
     * @param {object} [options]
     * @param {string | string[]} [options.protocols]
     */
    open(url, options = {}) {
      return new Promise((resolve, reject) => {
        setState('connecting');
        try {
          ws = new WebSocket(url, options.protocols);
        } catch (err) {
          setState('failed');
          reject(err);
          return;
        }

        ws.onopen = () => {
          setState('connected');
          resolve();
        };

        ws.onmessage = (event) => {
          for (const cb of messageListeners) {
            cb(event.data);
          }
        };

        ws.onclose = () => {
          ws = null;
          setState('disconnected');
        };

        ws.onerror = (_event) => {
          if (state === 'connecting') {
            setState('failed');
            reject(new Error('WebSocket connection failed'));
          }
        };
      });
    },

    /**
     * @param {object} [options]
     * @param {number} [options.code=1000]
     * @param {string} [options.reason]
     */
    close(options = {}) {
      return new Promise((resolve) => {
        if (!ws) {
          setState('disconnected');
          resolve();
          return;
        }
        const { code = 1000, reason } = options;
        const socket = ws;
        socket.onclose = () => {
          ws = null;
          setState('disconnected');
          resolve();
        };
        socket.close(code, reason);
      });
    },

    send(data) {
      if (!ws || state !== 'connected') {
        throw new Error('Cannot send data while not connected.');
      }
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    },

    onMessage(callback) {
      messageListeners.push(callback);
    },

    onStateChange(callback) {
      stateListeners.push(callback);
    },
  };
}
