/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for email adapters.
 * @sidecar email-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx email
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for outbound email adapters. Adapters own transport (memory,
 * console, SMTP, HTTP APIs like Resend / SendGrid / Postmark …) and must
 * expose the minimal contract below. The domain constructs and validates the
 * message; the adapter stamps the id, performs delivery, and records status.
 *
 * `send` is async so HTTP/SMTP adapters can fit naturally. Memory/console
 * adapters may resolve synchronously under the hood.
 *
 * @typedef {import('../domain/email-message.mjs').EmailMessageInput} EmailMessageInput
 * @typedef {import('../domain/email-message.mjs').EmailMessage} EmailMessage
 * @typedef {import('../domain/email-message.mjs').EmailRecord} EmailRecord
 * @typedef {import('../domain/email-message.mjs').EmailStatus} EmailStatus
 *
 * @typedef {object} EmailPort
 * @property {(message: EmailMessageInput) => Promise<EmailRecord>} send  Validate + deliver one message. Returns the stored record.
 * @property {(status?: EmailStatus) => EmailRecord[]} list               Snapshot of delivered / failed messages, optionally filtered.
 * @property {() => void} clear                                           Drop all recorded messages — useful for tests and dev.
 */

const REQUIRED = [
  ['send', 'email.port.missing_send'],
  ['list', 'email.port.missing_list'],
  ['clear', 'email.port.missing_clear'],
];

/**
 * Validate that an adapter conforms to the EmailPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertEmailPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('email.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
