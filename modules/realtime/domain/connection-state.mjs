/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Connection State domain logic for the realtime module.
 * @sidecar connection-state.mjs.header.md
 * @layer module | @hex domain | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Connection state machine for realtime transports.
 * Pure domain logic — no external dependencies.
 *
 * SpecRefs: TPL-148
 */

import { t } from '../messages.mjs';

/**
 * @typedef {'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'} ConnectionState
 */

/** @type {Record<string, readonly string[]>} */
const VALID_TRANSITIONS = {
  disconnected: ['connecting'],
  connecting: ['connected', 'failed'],
  connected: ['reconnecting', 'disconnected'],
  reconnecting: ['connecting', 'failed'],
  failed: ['connecting'],
};

/** All valid connection states. */
export const ConnectionStates = /** @type {const} */ ({
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
});

/**
 * Create a connection state machine with valid transition enforcement.
 *
 * @param {ConnectionState} [initial='disconnected']
 * @returns {{ getState: () => ConnectionState, transition: (to: ConnectionState) => void, onStateChange: (cb: (state: ConnectionState) => void) => void }}
 */
export function createConnectionStateMachine(initial = 'disconnected') {
  /** @type {ConnectionState} */
  let current = initial;
  /** @type {Array<(state: ConnectionState) => void>} */
  const listeners = [];

  return {
    getState() {
      return current;
    },

    /**
     * Transition to a new state. Throws on invalid transitions.
     * @param {ConnectionState} to
     */
    transition(to) {
      const allowed = VALID_TRANSITIONS[current];
      if (!allowed || !allowed.includes(to)) {
        throw new Error(t('realtime.connection.invalid_transition', { from: current, to }));
      }
      current = to;
      for (const cb of listeners) {
        cb(current);
      }
    },

    /**
     * Register a listener for state changes.
     * @param {(state: ConnectionState) => void} cb
     */
    onStateChange(cb) {
      listeners.push(cb);
    },
  };
}
