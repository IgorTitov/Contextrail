/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Message History.D implementation for the ai-chat module.
 * @sidecar message-history.d.ts.header.md
 * @layer module | @hex domain | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the message history manager.
 *
 * SpecRefs: TPL-075
 */

import type { AiChatMessage } from '../types.js';

export interface MessageHistory {
  addMessage(message: AiChatMessage): void;
  getMessages(): AiChatMessage[];
  clear(): void;
  getLastMessage(): AiChatMessage | null;
  toPromptContext(): Array<{ role: string; content: string }>;
}

export function createMessageHistory(options?: {
  maxMessages?: number;
}): MessageHistory;
