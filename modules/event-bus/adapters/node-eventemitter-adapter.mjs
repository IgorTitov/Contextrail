/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Node Eventemitter adapter for the event-bus module.
 * @sidecar node-eventemitter-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Node.js EventEmitter adapter (server-side).
 * Implements EventBusPort using Node.js built-in EventEmitter.
 *
 * This adapter demonstrates that the same port contract works on the server
 * with Node.js native primitives. It wraps `node:events` EventEmitter behind
 * the EventBusPort interface.
 *
 * @returns {import('../ports/event-bus-port.mjs').EventBusPort}
 */

import { EventEmitter } from 'node:events';

export function createNodeEventBus() {
  const emitter = new EventEmitter();

  return {
    /**
     * @param {string} event
     * @param {Function} handler
     */
    on(event, handler) {
      if (typeof handler !== 'function') {
        throw new TypeError('Event handler must be a function');
      }
      emitter.on(event, handler);
    },

    /**
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
      emitter.off(event, handler);
    },

    /**
     * @param {string} event
     * @param {...any} args
     */
    emit(event, ...args) {
      emitter.emit(event, ...args);
    },

    /**
     * @param {string} event
     * @returns {number}
     */
    listenerCount(event) {
      return emitter.listenerCount(event);
    },

    /**
     * Remove all listeners for all events.
     */
    clear() {
      emitter.removeAllListeners();
    },
  };
}
