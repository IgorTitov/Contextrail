/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the email module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx email
 * @public true
 * @edit careful
 */

// Domain
export {
  createEmailMessage,
  isValidEmailAddress,
  assertEmailAddress,
  normalizeRecipients,
  recipientCount,
} from './domain/email-message.mjs';

// Ports
export { assertEmailPort } from './ports/email-port.mjs';

// Adapters
export { createMemoryEmailAdapter } from './adapters/memory-email-adapter.mjs';
export { createConsoleEmailAdapter } from './adapters/console-email-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
