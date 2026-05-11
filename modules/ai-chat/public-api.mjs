/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Expose the single permitted entry point for the ai-chat module, re-exporting the port validator, adapters, and domain utilities for external consumers.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx ai-chat
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the ai-chat bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-071; TPL-076
 */

// Ports
export { assertAiChatPort } from './ports/ai-chat-port.mjs';

// Adapters
export { createEchoAdapter } from './adapters/echo-adapter.mjs';
export { createHttpApiAdapter } from './adapters/http-api-adapter.mjs';

// Domain
export { createMessageHistory } from './domain/message-history.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
