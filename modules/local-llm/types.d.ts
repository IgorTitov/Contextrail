/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Consolidate all TypeScript type definitions for the local-llm module: LocalLlmPort, LocalLlmProgress, LocalLlmModelConfig, LocalLlmLoadOptions, ModelCacheManager, and re-exported AiChat types.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx local-llm
 * @public true
 * @edit careful
 */

/**
 * TypeScript type definitions for the local-llm module.
 *
 * SpecRefs: TPL-080; TPL-084
 */

/**
 * AiChat types inlined to avoid cross-module relative import.
 * Mirrors modules/ai-chat/types.d.ts — keep in sync.
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

interface AiChatPort {
  sendMessage(message: string, options?: AiChatOptions): Promise<AiChatResponse>;
  streamMessage(message: string, options?: AiChatOptions): AsyncIterable<AiChatStreamChunk>;
  getHistory(): AiChatMessage[];
  clearHistory(): void;
  onMessage(listener: (message: AiChatMessage) => void): void;
  offMessage(listener: (message: AiChatMessage) => void): void;
}

export interface LocalLlmProgress {
  stage: 'downloading' | 'initializing' | 'ready' | 'error';
  /** 0 to 1 */
  progress: number;
  message?: string;
  bytesLoaded?: number;
  bytesTotal?: number;
}

export interface LocalLlmModelConfig {
  modelId: string;
  displayName: string;
  /** Approximate size in bytes */
  sizeBytes: number;
  backend: 'webllm' | 'transformers';
  quantization?: string;
  contextLength?: number;
}

export interface LocalLlmLoadOptions {
  onProgress?: (progress: LocalLlmProgress) => void;
  contextLength?: number;
  quantization?: string;
}

export interface LocalLlmPort extends AiChatPort {
  loadModel(modelId: string, options?: LocalLlmLoadOptions): Promise<void>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;
}

export interface ModelCacheStorageEstimate {
  bytesUsed: number;
  bytesAvailable: number;
}

export interface ModelCacheManager {
  getCachedModels(): Promise<string[]>;
  isModelCached(modelId: string): Promise<boolean>;
  estimateStorageUsage(): Promise<ModelCacheStorageEstimate>;
  clearModelCache(modelId?: string): Promise<void>;
  getAvailableModels(): LocalLlmModelConfig[];
}

// AiChatMessage, AiChatResponse, AiChatOptions, AiChatStreamChunk are defined
// and exported directly above (inlined from ai-chat module).
