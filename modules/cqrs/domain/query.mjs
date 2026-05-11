/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure Query value object — validated type + payload + optional metadata.
 * @sidecar query.mjs.header.md
 * @layer domain | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure Query value object. Queries describe an intent to read state
 * without side effects. The domain only validates shape — the QueryBus
 * adapter stamps `id` and `createdAt` when the query is asked.
 *
 * Mirrors {@link Command} on purpose: keeping the two shapes symmetrical
 * lets handlers, buses, and tests reuse the same helpers and mental model.
 *
 * @typedef {object} Query
 * @property {string} type                        Dot-separated type (e.g. `order.get`).
 * @property {Record<string, unknown>} payload    Plain-object read criteria.
 * @property {Record<string, string>} metadata    Flat string map (empty when omitted).
 */

const TYPE_RE = /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/;

/**
 * Validate and construct a {@link Query} value object.
 *
 * @param {{ type: string, payload: Record<string, unknown>, metadata?: Record<string, string> }} input
 * @returns {Query}
 */
export function createQuery(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('cqrs.query.invalid'));
  }
  const { type, payload, metadata } = input;
  if (typeof type !== 'string' || !TYPE_RE.test(type)) {
    throw new TypeError(t('cqrs.query.invalid_type'));
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError(t('cqrs.query.invalid_payload'));
  }
  /** @type {Record<string, string>} */
  const meta = {};
  if (metadata != null) {
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new TypeError(t('cqrs.query.invalid_metadata'));
    }
    for (const [k, v] of Object.entries(metadata)) {
      if (typeof v !== 'string') {
        throw new TypeError(t('cqrs.query.invalid_metadata'));
      }
      meta[k] = v;
    }
  }
  return { type, payload: { ...payload }, metadata: meta };
}
