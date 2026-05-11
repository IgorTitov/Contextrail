/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Event Emitter domain logic for the event-bus module.
 * @sidecar event-emitter.mjs.header.md
 * @layer module | @hex domain | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for typed event emission.
 * Framework-free, no external dependencies.
 *
 * SpecRefs: TPL-044
 */

/**
 * @typedef {Object} EventBusCore
 * @property {(event: string, handler: Function) => void} on
 * @property {(event: string, handler: Function) => void} off
 * @property {(event: string, ...args: any[]) => void} emit
 * @property {(event: string) => number} listenerCount
 * @property {() => void} clear
 */

/**
 * Create a new event emitter (in-memory Map-backed).
 * This is the core domain object — adapters wrap it.
 *
 * @returns {EventBusCore}
 */
export function createEventEmitter() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  // Lazy-import avoided: domain must stay pure.
  // Use inline message that matches the messages.mjs key.
  return {
    /**
     * Subscribe to an event.
     * @param {string} event
     * @param {Function} handler
     */
    on(event, handler) {
      if (typeof handler !== 'function') {
        throw new TypeError('Event handler must be a function');
      }
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(handler);
    },

    /**
     * Unsubscribe from an event.
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
      const set = listeners.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) listeners.delete(event);
      }
    },

    /**
     * Emit an event to all registered handlers.
     * @param {string} event
     * @param {...any} args
     */
    emit(event, ...args) {
      const set = listeners.get(event);
      if (set) {
        for (const handler of set) {
          handler(...args);
        }
      }
    },

    /**
     * Return count of listeners for an event.
     * @param {string} event
     * @returns {number}
     */
    listenerCount(event) {
      const set = listeners.get(event);
      return set ? set.size : 0;
    },

    /**
     * Remove all listeners for all events.
     */
    clear() {
      listeners.clear();
    },
  };
}
