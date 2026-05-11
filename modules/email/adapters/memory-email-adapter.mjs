/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory EmailPort adapter — captures sent messages for tests and dev.
 * @sidecar memory-email-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx email
 * @public false
 * @edit careful
 */

import { createEmailMessage } from '../domain/email-message.mjs';

/**
 * In-memory EmailPort adapter. Validates each message through the domain,
 * stamps it with an id + timestamp, stores it, and returns the resulting
 * EmailRecord. Ideal for unit tests, integration tests, and as the default
 * in dev mode before a real SMTP / HTTP provider is configured.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]        Clock function (defaults to Date.now).
 * @param {() => string} [options.idFactory]  Id generator (defaults to email-N counter).
 * @returns {import('../ports/email-port.mjs').EmailPort}
 */
export function createMemoryEmailAdapter(options = {}) {
  const clock = options.now ?? Date.now;
  let counter = 0;
  const idFactory = options.idFactory ?? (() => `email-${++counter}`);

  /** @type {import('../domain/email-message.mjs').EmailRecord[]} */
  const records = [];

  return {
    async send(input) {
      const message = createEmailMessage(input);
      const id = idFactory();
      message.id = id;
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
