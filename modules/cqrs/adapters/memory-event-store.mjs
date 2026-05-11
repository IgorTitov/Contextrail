/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory EventStorePort adapter — stream-per-aggregate + optimistic concurrency + subscribers.
 * @sidecar memory-event-store.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { createEvent } from '../domain/event.mjs';

/**
 * In-memory EventStorePort adapter. Maintains one stream per aggregate
 * id plus a flat global log for `loadAll`. `append` enforces optimistic
 * concurrency: `expectedVersion` must equal the current stream length,
 * otherwise a typed version-conflict error is thrown and no events are
 * recorded. Each appended event is stamped with `id = evt_N`,
 * `sequence = N` (global across aggregates), and `recordedAt` from an
 * injectable clock.
 *
 * Subscribers receive stamped events fire-and-forget after a successful
 * append. Listener exceptions are swallowed so a broken subscriber
 * cannot corrupt the append path.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]
 * @returns {import('../ports/event-store-port.mjs').EventStorePort}
 */
export function createMemoryEventStore(options = {}) {
  const clock = options.now ?? Date.now;
  /** @type {Map<string, import('../domain/event.mjs').DomainEvent[]>} */
  const streams = new Map();
  /** @type {import('../domain/event.mjs').DomainEvent[]} */
  const allEvents = [];
  /** @type {Set<import('../ports/event-store-port.mjs').EventStoreListener>} */
  const listeners = new Set();
  let nextId = 1;

  return {
    async append(aggregateId, expectedVersion, events) {
      if (typeof aggregateId !== 'string' || aggregateId.length === 0) {
        throw new TypeError(t('cqrs.event.invalid_aggregate'));
      }
      if (!Array.isArray(events)) {
        throw new TypeError(t('cqrs.event.invalid'));
      }
      const stream = streams.get(aggregateId) ?? [];
      if (stream.length !== expectedVersion) {
        throw new TypeError(
          t('cqrs.event_store.version_conflict', {
            id: aggregateId,
            expected: expectedVersion,
            actual: stream.length,
          }),
        );
      }
      const stamped = [];
      for (const raw of events) {
        const validated = createEvent({ ...raw, aggregateId });
        const stampedEvent = {
          ...validated,
          id: `evt_${nextId}`,
          sequence: nextId,
          recordedAt: clock(),
        };
        nextId += 1;
        stream.push(stampedEvent);
        allEvents.push(stampedEvent);
        stamped.push(stampedEvent);
      }
      streams.set(aggregateId, stream);
      for (const stampedEvent of stamped) {
        for (const listener of listeners) {
          try {
            listener(stampedEvent);
          } catch {
            // swallow — a broken subscriber must not corrupt the append path
          }
        }
      }
      return stamped;
    },

    async load(aggregateId) {
      const stream = streams.get(aggregateId) ?? [];
      return stream.slice();
    },

    loadAll(filter = {}) {
      return allEvents.filter((event) => {
        if (filter.aggregateId && event.aggregateId !== filter.aggregateId) return false;
        if (filter.type && event.type !== filter.type) return false;
        return true;
      });
    },

    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError(t('cqrs.event_store.missing_subscribe'));
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    clear() {
      streams.clear();
      allEvents.length = 0;
      listeners.clear();
      nextId = 1;
    },
  };
}
