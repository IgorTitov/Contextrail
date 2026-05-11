/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public Api.D implementation for the ai-chat module.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the ai-chat public API.
 *
 * SpecRefs: TPL-071; TPL-076
 */

export {
  AiChatMessage,
  AiChatResponse,
  AiChatOptions,
  AiChatStreamChunk,
  AiChatPort,
} from './types.js';

export { assertAiChatPort } from './ports/ai-chat-port.js';
export { createEchoAdapter } from './adapters/echo-adapter.js';
export { createHttpApiAdapter } from './adapters/http-api-adapter.js';
export { createMessageHistory } from './domain/message-history.js';
