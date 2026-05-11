/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure event-sourcing aggregate helper — fold events into state and track pending changes.
 * @sidecar aggregate.mjs.header.md
 * @layer domain | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Minimal pure event-sourcing helper. `createAggregate` wraps an initial
 * state and a reducer, lets callers `apply` new events (reducing state
 * and tracking pending uncommitted events), and tracks a `version` number
 * that the EventStore uses for optimistic concurrency.
 *
 * `replayAggregate` is a pure fold for reconstructing state from a
 * previously-loaded sequence of events without tracking pending changes —
 * used by query handlers and read-model rebuilds.
 *
 * No I/O, no framework imports.
 *
 * @typedef {import('./event.mjs').DomainEvent} DomainEvent
 *
 * @typedef {object} Aggregate
 * @property {string} id
 * @property {unknown} state
 * @property {number} version
 * @property {(event: DomainEvent) => void} apply
 * @property {DomainEvent[]} pending
 */

/**
 * Create a new event-sourced aggregate wrapper.
 *
 * @param {object} input
 * @param {string} input.id
 * @param {unknown} input.initialState
 * @param {(state: unknown, event: DomainEvent) => unknown} input.reducer
 * @returns {Aggregate}
 */
export function createAggregate(input) {
  if (!input || typeof input !== 'object' || typeof input.id !== 'string' || !input.id) {
    throw new TypeError(t('cqrs.aggregate.invalid'));
  }
  if (typeof input.reducer !== 'function') {
    throw new TypeError(t('cqrs.aggregate.invalid_reducer'));
  }
  const { id, initialState, reducer } = input;
  /** @type {DomainEvent[]} */
  const pending = [];
  /** @type {Aggregate} */
  const agg = {
    id,
    state: initialState,
    version: 0,
    pending,
    apply(event) {
      agg.state = reducer(agg.state, event);
      agg.version += 1;
      pending.push(event);
    },
  };
  return agg;
}

/**
 * Replay a sequence of events into final state using the given reducer.
 * Pure fold — does not track pending events, does not mutate the input.
 *
 * @param {string} _id                      Aggregate id (informational — kept for symmetry with createAggregate).
 * @param {unknown} initialState
 * @param {(state: unknown, event: DomainEvent) => unknown} reducer
 * @param {DomainEvent[]} events
 * @returns {{ id: string, state: unknown, version: number }}
 */
export function replayAggregate(_id, initialState, reducer, events) {
  if (typeof reducer !== 'function') {
    throw new TypeError(t('cqrs.aggregate.invalid_reducer'));
  }
  if (!Array.isArray(events)) {
    throw new TypeError(t('cqrs.aggregate.invalid'));
  }
  let state = initialState;
  for (const event of events) {
    state = reducer(state, event);
  }
  return { id: _id, state, version: events.length };
}
