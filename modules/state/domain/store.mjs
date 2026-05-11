/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Store domain logic for the state module.
 * @sidecar store.mjs.header.md
 * @layer module | @hex domain | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for observable state management.
 * Framework-free, no external dependencies.
 *
 * SpecRefs: TPL-048
 */

/**
 * @template T
 * @typedef {Object} Store
 * @property {() => T} getState
 * @property {(updater: T | ((prev: T) => T)) => void} setState
 * @property {(listener: (state: T) => void) => () => void} subscribe
 * @property {() => number} subscriberCount
 */

/**
 * Create a new observable store with initial state.
 *
 * @template T
 * @param {T} initialState
 * @returns {Store<T>}
 */
export function createStore(initialState) {
  let state = initialState;
  /** @type {Set<(state: T) => void>} */
  const subscribers = new Set();

  return {
    /**
     * Get current state (returns a shallow copy for objects).
     * @returns {T}
     */
    getState() {
      if (state !== null && typeof state === 'object' && !Array.isArray(state)) {
        return /** @type {T} */ ({ ...state });
      }
      return state;
    },

    /**
     * Set state directly or via updater function. Notifies subscribers.
     * @param {T | ((prev: T) => T)} updater
     */
    setState(updater) {
      const prev = state;
      state =
        typeof updater === 'function' ? /** @type {(prev: T) => T} */ (updater)(prev) : updater;
      if (state !== prev) {
        for (const listener of subscribers) {
          listener(state);
        }
      }
    },

    /**
     * Subscribe to state changes. Returns an unsubscribe function.
     * @param {(state: T) => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('State listener must be a function');
      }
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },

    /**
     * Return the number of active subscribers.
     * @returns {number}
     */
    subscriberCount() {
      return subscribers.size;
    },
  };
}
