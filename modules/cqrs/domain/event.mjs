/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure DomainEvent value object — validated type + aggregate id + payload.
 * @sidecar event.mjs.header.md
 * @layer domain | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure DomainEvent value object. Events are immutable facts about
 * something that happened in the write model. The domain only validates
 * shape — the EventStore adapter stamps `id`, `sequence`, and
 * `recordedAt` when the event is appended.
 *
 * Distinct from `modules/event-bus/` messages: event-bus is a transient
 * pub/sub primitive for cross-module notifications, while cqrs events are
 * the durable write-model facts that feed projections and replay.
 *
 * `type` follows `Aggregate.Verbed` shape (PascalCase.PascalCase) so the
 * owning aggregate is always visible in the event name
 * (`Order.Placed`, `User.Registered`).
 *
 * @typedef {object} DomainEvent
 * @property {string} type                        Dot-separated `Aggregate.Verbed` name.
 * @property {string} aggregateId                 Id of the aggregate this event belongs to.
 * @property {Record<string, unknown>} payload    Plain-object event body.
 * @property {Record<string, string>} metadata    Flat string map (empty when omitted).
 * @property {string} [id]                        Stamped by the EventStore adapter.
 * @property {number} [sequence]                  Global append sequence, stamped by the adapter.
 * @property {number} [recordedAt]                Epoch ms, stamped by the adapter.
 */

const TYPE_RE = /^[A-Z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/;

/**
 * Validate and construct a {@link DomainEvent} value object.
 *
 * @param {{ type: string, aggregateId: string, payload: Record<string, unknown>, metadata?: Record<string, string> }} input
 * @returns {DomainEvent}
 */
export function createEvent(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('cqrs.event.invalid'));
  }
  const { type, aggregateId, payload, metadata } = input;
  if (typeof type !== 'string' || !TYPE_RE.test(type)) {
    throw new TypeError(t('cqrs.event.invalid_type'));
  }
  if (typeof aggregateId !== 'string' || aggregateId.length === 0) {
    throw new TypeError(t('cqrs.event.invalid_aggregate'));
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError(t('cqrs.event.invalid_payload'));
  }
  /** @type {Record<string, string>} */
  const meta = {};
  if (metadata != null) {
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new TypeError(t('cqrs.event.invalid_metadata'));
    }
    for (const [k, v] of Object.entries(metadata)) {
      if (typeof v !== 'string') {
        throw new TypeError(t('cqrs.event.invalid_metadata'));
      }
      meta[k] = v;
    }
  }
  return { type, aggregateId, payload: { ...payload }, metadata: meta };
}
