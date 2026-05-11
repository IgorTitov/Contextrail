/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Channel-based pub/sub message routing for realtime transports.
 * @sidecar channel-router.mjs.header.md
 * @layer module | @hex domain | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Channel-based pub/sub message router for realtime transports.
 * Routes incoming messages to channel subscribers and forwards
 * connection state changes to registered listeners.
 *
 * SpecRefs: TPL-153
 */

/**
 * @typedef {object} ChannelRouter
 * @property {(raw: unknown) => void} handleMessage
 * @property {(channel: string, callback: (data: unknown) => void) => void} subscribe
 * @property {(channel: string, callback?: (data: unknown) => void) => void} unsubscribe
 * @property {(callback: (state: string) => void) => void} onConnectionChange
 * @property {(state: string) => void} notifyConnectionChange
 */

/**
 * Create a channel router that dispatches incoming messages to subscribers
 * and forwards connection state changes to listeners.
 *
 * @returns {ChannelRouter}
 */
export function createChannelRouter() {
  /** @type {Map<string, Set<(data: unknown) => void>>} */
  const channelSubscriptions = new Map();
  /** @type {Array<(state: string) => void>} */
  const connectionChangeListeners = [];

  /**
   * Handle incoming messages: parse and route to channel subscribers.
   * @param {unknown} raw
   */
  function handleMessage(raw) {
    let parsed;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { channel: '_default', data: raw };
      }
    } else {
      parsed = raw;
    }

    const channel = parsed?.channel || '_default';
    const data = parsed?.data ?? parsed;
    const subs = channelSubscriptions.get(channel);
    if (subs) {
      for (const cb of subs) {
        cb(data);
      }
    }
  }

  /**
   * Subscribe to a channel.
   * @param {string} channel
   * @param {(data: unknown) => void} callback
   */
  function subscribe(channel, callback) {
    if (!channelSubscriptions.has(channel)) {
      channelSubscriptions.set(channel, new Set());
    }
    channelSubscriptions.get(channel).add(callback);
  }

  /**
   * Unsubscribe from a channel. If callback is omitted, removes all subscribers.
   * @param {string} channel
   * @param {((data: unknown) => void)} [callback]
   */
  function unsubscribe(channel, callback) {
    const subs = channelSubscriptions.get(channel);
    if (!subs) return;
    if (callback) {
      subs.delete(callback);
      if (subs.size === 0) {
        channelSubscriptions.delete(channel);
      }
    } else {
      channelSubscriptions.delete(channel);
    }
  }

  /**
   * Register a connection state change listener.
   * @param {(state: string) => void} callback
   */
  function onConnectionChange(callback) {
    connectionChangeListeners.push(callback);
  }

  /**
   * Notify all connection state listeners of a new state.
   * @param {string} newState
   */
  function notifyConnectionChange(newState) {
    for (const cb of connectionChangeListeners) {
      cb(newState);
    }
  }

  return { handleMessage, subscribe, unsubscribe, onConnectionChange, notifyConnectionChange };
}
