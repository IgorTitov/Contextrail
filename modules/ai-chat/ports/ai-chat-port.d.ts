/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Ai Chat Port.D port for the ai-chat module.
 * @sidecar ai-chat-port.d.ts.header.md
 * @layer module | @hex port | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the ai-chat port.
 *
 * SpecRefs: TPL-072
 */

export {
  AiChatMessage,
  AiChatResponse,
  AiChatOptions,
  AiChatStreamChunk,
  AiChatPort,
} from '../types.js';

export function assertAiChatPort(adapter: unknown): void;
