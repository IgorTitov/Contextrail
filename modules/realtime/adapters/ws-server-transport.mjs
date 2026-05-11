/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Ws Server Transport adapter for the realtime module.
 * @sidecar ws-server-transport.mjs.header.md
 * @layer module | @hex adapter | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * WebSocket server transport adapter (server-side).
 * Implements TransportPort for server-side WebSocket connections.
 *
 * Unlike the client-side websocket-transport which creates outgoing connections,
 * this adapter wraps an incoming connection object from a WebSocket server
 * (e.g. `ws` library). The connection is injected — no hard dependency on
 * any WebSocket server library.
 *
 * Expected connection interface (compatible with `ws` WebSocket):
 *   { on(event, handler), send(data), close(code?, reason?), readyState }
 *
 * @typedef {object} WsConnection
 * @property {(event: string, handler: Function) => void} on
 * @property {(data: string) => void} send
 * @property {(code?: number, reason?: string) => void} close
 * @property {number} readyState — 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
 *
 * @returns {import('../ports/transport-port.mjs').TransportPort}
 */
export function createWsServerTransport() {
  /** @type {WsConnection | null} */
  let conn = null;
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
      // Server-side — always supported when running in Node.js
      return typeof process !== 'undefined' && typeof process.versions?.node === 'string';
    },

    getState() {
      return state;
    },

    /**
     * Accept an incoming WebSocket connection.
     * The `url` parameter is ignored (the connection is already established).
     * Pass the connection object via `options.connection`.
     *
     * @param {string} _url — ignored for server transport
     * @param {{ connection: WsConnection }} [options]
     */
    open(_url, options = {}) {
      return new Promise((resolve, reject) => {
        const connection = options.connection;
        if (!connection) {
          setState('failed');
          reject(new Error('ws-server-transport requires options.connection'));
          return;
        }

        conn = connection;
        setState('connecting');

        // If connection is already open (readyState === 1)
        if (conn.readyState === 1) {
          setState('connected');
          conn.on('message', (data) => {
            for (const cb of messageListeners) {
              cb(data);
            }
          });
          conn.on('close', () => {
            conn = null;
            setState('disconnected');
          });
          resolve();
          return;
        }

        // Otherwise wait for open event
        conn.on('open', () => {
          setState('connected');
          resolve();
        });

        conn.on('message', (data) => {
          for (const cb of messageListeners) {
            cb(data);
          }
        });

        conn.on('close', () => {
          conn = null;
          setState('disconnected');
        });

        conn.on('error', () => {
          if (state === 'connecting') {
            setState('failed');
            reject(new Error('WebSocket server connection failed'));
          }
        });
      });
    },

    close() {
      return new Promise((resolve) => {
        if (!conn) {
          setState('disconnected');
          resolve();
          return;
        }
        const socket = conn;
        socket.on('close', () => {
          conn = null;
          setState('disconnected');
          resolve();
        });
        socket.close(1000, 'server closing');
      });
    },

    send(data) {
      if (!conn || state !== 'connected') {
        throw new Error('Cannot send data while not connected.');
      }
      conn.send(typeof data === 'string' ? data : JSON.stringify(data));
    },

    onMessage(callback) {
      messageListeners.push(callback);
    },

    onStateChange(callback) {
      stateListeners.push(callback);
    },
  };
}
