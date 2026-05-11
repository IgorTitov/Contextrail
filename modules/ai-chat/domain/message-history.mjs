/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a pure, framework-free domain utility for managing bounded conversation history, including message capping and prompt-context projection.
 * @sidecar message-history.mjs.header.md
 * @layer module | @hex domain | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Pure domain utility for conversation history management.
 * Framework-free, no external dependencies.
 *
 * SpecRefs: TPL-075
 */

/**
 * Create a message history manager.
 *
 * @param {{ maxMessages?: number }} [options]
 * @returns {{
 *   addMessage: (message: import('../ports/ai-chat-port.mjs').AiChatMessage) => void,
 *   getMessages: () => import('../ports/ai-chat-port.mjs').AiChatMessage[],
 *   clear: () => void,
 *   getLastMessage: () => import('../ports/ai-chat-port.mjs').AiChatMessage | null,
 *   toPromptContext: () => Array<{ role: string, content: string }>,
 * }}
 */
export function createMessageHistory(options = {}) {
  const maxMessages = options.maxMessages ?? 100;

  /** @type {import('../ports/ai-chat-port.mjs').AiChatMessage[]} */
  let messages = [];

  return {
    /** @param {import('../ports/ai-chat-port.mjs').AiChatMessage} message */
    addMessage(message) {
      messages.push(message);
      if (messages.length > maxMessages) {
        messages = messages.slice(messages.length - maxMessages);
      }
    },

    /** @returns {import('../ports/ai-chat-port.mjs').AiChatMessage[]} */
    getMessages() {
      return [...messages];
    },

    clear() {
      messages = [];
    },

    /** @returns {import('../ports/ai-chat-port.mjs').AiChatMessage | null} */
    getLastMessage() {
      return messages.length > 0 ? messages[messages.length - 1] : null;
    },

    /** @returns {Array<{ role: string, content: string }>} */
    toPromptContext() {
      return messages.map((m) => ({ role: m.role, content: m.content }));
    },
  };
}
