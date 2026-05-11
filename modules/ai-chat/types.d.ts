/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the ai-chat module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Core type definitions for the ai-chat module.
 *
 * SpecRefs: TPL-072
 */

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AiChatResponse {
  message: AiChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export interface AiChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AiChatStreamChunk {
  delta: string;
  done: boolean;
  message?: AiChatMessage;
}

export interface AiChatPort {
  sendMessage(message: string, options?: AiChatOptions): Promise<AiChatResponse>;
  streamMessage(message: string, options?: AiChatOptions): AsyncIterable<AiChatStreamChunk>;
  getHistory(): AiChatMessage[];
  clearHistory(): void;
  onMessage(listener: (message: AiChatMessage) => void): void;
  offMessage(listener: (message: AiChatMessage) => void): void;
}
