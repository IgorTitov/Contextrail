/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define the LocalLlmPort contract extending AiChatPort with model loading lifecycle operations, plus the LocalLlmProgress, LocalLlmModelConfig, and LocalLlmLoadOptions types.
 * @sidecar local-llm-port.mjs.header.md
 * @layer module | @hex port | @ctx local-llm
 * @public true
 * @edit careful
 */

/**
 * Port contract for local LLM adapters.
 * Extends AiChatPort with model loading lifecycle operations.
 *
 * SpecRefs: TPL-080
 *
 * @typedef {import('../../ai-chat/ports/ai-chat-port.mjs').AiChatMessage} AiChatMessage
 * @typedef {import('../../ai-chat/ports/ai-chat-port.mjs').AiChatResponse} AiChatResponse
 * @typedef {import('../../ai-chat/ports/ai-chat-port.mjs').AiChatOptions} AiChatOptions
 * @typedef {import('../../ai-chat/ports/ai-chat-port.mjs').AiChatStreamChunk} AiChatStreamChunk
 *
 * @typedef {Object} LocalLlmProgress
 * @property {'downloading' | 'initializing' | 'ready' | 'error'} stage
 * @property {number} progress - 0 to 1
 * @property {string} [message]
 * @property {number} [bytesLoaded]
 * @property {number} [bytesTotal]
 *
 * @typedef {Object} LocalLlmModelConfig
 * @property {string} modelId
 * @property {string} displayName
 * @property {number} sizeBytes
 * @property {'webllm' | 'transformers'} backend
 * @property {string} [quantization]
 * @property {number} [contextLength]
 *
 * @typedef {Object} LocalLlmLoadOptions
 * @property {(progress: LocalLlmProgress) => void} [onProgress]
 * @property {number} [contextLength]
 * @property {string} [quantization]
 *
 * @typedef {Object} LocalLlmPort
 * @property {(message: string, options?: AiChatOptions) => Promise<AiChatResponse>} sendMessage
 * @property {(message: string, options?: AiChatOptions) => AsyncIterable<AiChatStreamChunk>} streamMessage
 * @property {() => AiChatMessage[]} getHistory
 * @property {() => void} clearHistory
 * @property {(listener: (message: AiChatMessage) => void) => void} onMessage
 * @property {(listener: (message: AiChatMessage) => void) => void} offMessage
 * @property {(modelId: string, options?: LocalLlmLoadOptions) => Promise<void>} loadModel
 * @property {() => Promise<void>} unloadModel
 * @property {() => boolean} isModelLoaded
 */

/**
 * AiChatPort methods inlined to avoid cross-module relative import.
 * Mirrors modules/ai-chat/ports/ai-chat-port.mjs — keep in sync.
 */
const AI_CHAT_METHODS = [
  'sendMessage',
  'streamMessage',
  'getHistory',
  'clearHistory',
  'onMessage',
  'offMessage',
];

const LIFECYCLE_METHODS = ['loadModel', 'unloadModel', 'isModelLoaded'];

/**
 * Validate that an adapter conforms to the LocalLlmPort contract.
 * Checks AiChatPort methods inline, then local-llm lifecycle methods.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertLocalLlmPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('AiChatPort adapter must be a non-null object');
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of AI_CHAT_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(`AiChatPort adapter must implement ${method}()`);
    }
  }
  for (const method of LIFECYCLE_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(`LocalLlmPort adapter must implement ${method}()`);
    }
  }
}
