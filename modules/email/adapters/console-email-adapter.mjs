/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Console EmailPort adapter — validates and logs messages instead of delivering them.
 * @sidecar console-email-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx email
 * @public false
 * @edit careful
 */

import { createEmailMessage, recipientCount } from '../domain/email-message.mjs';

/**
 * Console EmailPort adapter. Validates messages through the domain, then
 * logs a compact summary to the injected logger instead of actually
 * delivering anything. Useful as the default in development so the dev sees
 * outgoing traffic without needing SMTP credentials. Keeps the same record
 * shape as the memory adapter so callers can swap freely.
 *
 * @param {object} [options]
 * @param {(summary: { id: string, from: string, to: string[], subject: string, recipients: number }) => void} [options.log]  Custom log sink (defaults to console.log).
 * @param {() => number} [options.now]        Clock function.
 * @param {() => string} [options.idFactory]  Id generator (defaults to console-email-N).
 * @returns {import('../ports/email-port.mjs').EmailPort}
 */
export function createConsoleEmailAdapter(options = {}) {
  const clock = options.now ?? Date.now;
  let counter = 0;
  const idFactory = options.idFactory ?? (() => `console-email-${++counter}`);
  const log =
    options.log ??
    ((summary) => {
      console.log('[email]', summary);
    });

  /** @type {import('../domain/email-message.mjs').EmailRecord[]} */
  const records = [];

  return {
    async send(input) {
      const message = createEmailMessage(input);
      const id = idFactory();
      message.id = id;
      log({
        id,
        from: message.from,
        to: message.to,
        subject: message.subject,
        recipients: recipientCount(message),
      });
      /** @type {import('../domain/email-message.mjs').EmailRecord} */
      const record = {
        id,
        status: 'sent',
        message,
        sentAt: clock(),
      };
      records.push(record);
      return record;
    },

    list(status) {
      if (!status) return [...records];
      return records.filter((r) => r.status === status);
    },

    clear() {
      records.length = 0;
    },
  };
}
