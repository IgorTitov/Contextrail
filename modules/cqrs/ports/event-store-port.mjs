/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for event-store adapters (append + load + loadAll + subscribe + clear).
 * @sidecar event-store-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for event-store adapters. The event store is the
 * durable log of domain events that feeds projections, read models,
 * and event-sourced aggregate replay. `append` enforces optimistic
 * concurrency via `expectedVersion` — callers claim a version they
 * previously read, and the store rejects the append if another writer
 * has advanced the stream in the meantime.
 *
 * Adapters stamp each appended event with `id`, `sequence`, and
 * `recordedAt`. Subscribers receive stamped events fire-and-forget;
 * listener errors are swallowed by the adapter so a broken subscriber
 * cannot corrupt the append path.
 *
 * @typedef {import('../domain/event.mjs').DomainEvent} DomainEvent
 *
 * @typedef {(event: DomainEvent) => void} EventStoreListener
 *
 * @typedef {object} EventStoreFilter
 * @property {string} [aggregateId]   Restrict loadAll to one aggregate.
 * @property {string} [type]          Restrict loadAll to one event type.
 *
 * @typedef {object} EventStorePort
 * @property {(aggregateId: string, expectedVersion: number, events: DomainEvent[]) => Promise<DomainEvent[]>} append
 * @property {(aggregateId: string) => Promise<DomainEvent[]>} load
 * @property {(filter?: EventStoreFilter) => DomainEvent[]} loadAll
 * @property {(listener: EventStoreListener) => (() => void)} subscribe
 * @property {() => void} clear
 */

const REQUIRED = [
  ['append', 'cqrs.event_store.missing_append'],
  ['load', 'cqrs.event_store.missing_load'],
  ['loadAll', 'cqrs.event_store.missing_loadAll'],
  ['subscribe', 'cqrs.event_store.missing_subscribe'],
  ['clear', 'cqrs.event_store.missing_clear'],
];

/**
 * Validate that an adapter conforms to the EventStorePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertEventStorePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('cqrs.event_store.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
