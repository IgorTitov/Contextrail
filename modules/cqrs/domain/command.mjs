/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure Command value object — validated type + payload + optional metadata.
 * @sidecar command.mjs.header.md
 * @layer domain | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure Command value object. Commands describe a user or system intent to
 * change state. The domain only validates shape — the CommandBus adapter
 * stamps `id` and `createdAt` when the command is dispatched.
 *
 * `type` follows `domain.action` or `Domain.Action` shape so every command
 * carries a bounded-context hint (e.g. `order.place`, `Order.Place`).
 *
 * `metadata` commonly carries `tenantId`, `correlationId`, `userId`, or
 * other cross-cutting tags that downstream handlers need to route on
 * without polluting the payload.
 *
 * No I/O, no framework imports. All errors carry i18n keys.
 *
 * @typedef {object} Command
 * @property {string} type                        Dot-separated type (e.g. `order.place`).
 * @property {Record<string, unknown>} payload    Plain-object write intent.
 * @property {Record<string, string>} metadata    Flat string map (empty when omitted).
 */

const TYPE_RE = /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/;

/**
 * Validate and construct a {@link Command} value object.
 *
 * @param {{ type: string, payload: Record<string, unknown>, metadata?: Record<string, string> }} input
 * @returns {Command}
 */
export function createCommand(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('cqrs.command.invalid'));
  }
  const { type, payload, metadata } = input;
  if (typeof type !== 'string' || !TYPE_RE.test(type)) {
    throw new TypeError(t('cqrs.command.invalid_type'));
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError(t('cqrs.command.invalid_payload'));
  }
  /** @type {Record<string, string>} */
  const meta = {};
  if (metadata != null) {
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new TypeError(t('cqrs.command.invalid_metadata'));
    }
    for (const [k, v] of Object.entries(metadata)) {
      if (typeof v !== 'string') {
        throw new TypeError(t('cqrs.command.invalid_metadata'));
      }
      meta[k] = v;
    }
  }
  return { type, payload: { ...payload }, metadata: meta };
}
