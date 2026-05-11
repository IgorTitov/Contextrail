/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define the AiChatPort contract that all AI chat adapters must satisfy, plus the shared AiChatMessage, AiChatResponse, AiChatOptions, and AiChatStreamChunk types.
 * @sidecar ai-chat-port.mjs.header.md
 * @layer module | @hex port | @ctx ai-chat
 * @public true
 * @edit careful
 */

/**
 * Port contract for AI chat adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-072
 *
 * @typedef {Object} AiChatMessage
 * @property {string} id
 * @property {'user' | 'assistant' | 'system'} role
 * @property {string} content
 * @property {number} timestamp
 *
 * @typedef {Object} AiChatResponse
 * @property {AiChatMessage} message
 * @property {{ promptTokens: number, completionTokens: number, totalTokens: number }} [usage]
 * @property {string} [model]
 *
 * @typedef {Object} AiChatOptions
 * @property {string} [systemPrompt]
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {string} [model]
 *
 * @typedef {Object} AiChatStreamChunk
 * @property {string} delta
 * @property {boolean} done
 * @property {AiChatMessage} [message]
 *
 * @typedef {Object} AiChatPort
 * @property {(message: string, options?: AiChatOptions) => Promise<AiChatResponse>} sendMessage
 * @property {(message: string, options?: AiChatOptions) => AsyncIterable<AiChatStreamChunk>} streamMessage
 * @property {() => AiChatMessage[]} getHistory
 * @property {() => void} clearHistory
 * @property {(listener: (message: AiChatMessage) => void) => void} onMessage
 * @property {(listener: (message: AiChatMessage) => void) => void} offMessage
 */

const REQUIRED_METHODS = [
  'sendMessage',
  'streamMessage',
  'getHistory',
  'clearHistory',
  'onMessage',
  'offMessage',
];

/**
 * Validate that an adapter conforms to the AiChatPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertAiChatPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('AiChatPort adapter must be a non-null object');
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(`AiChatPort adapter must implement ${method}()`);
    }
  }
}
