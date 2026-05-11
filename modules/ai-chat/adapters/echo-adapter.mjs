/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a zero-dependency echo adapter for development and testing that mirrors user messages back with configurable delay, satisfying the full AiChatPort contract.
 * @sidecar echo-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Echo adapter for development and testing.
 * Mirrors user messages back with a configurable delay.
 *
 * SpecRefs: TPL-073
 */

import { createMessageHistory } from '../domain/message-history.mjs';
import { t } from '../messages.mjs';

let idCounter = 0;

/** @returns {string} */
function nextId() {
  idCounter += 1;
  return `echo_${idCounter}_${Date.now()}`;
}

/**
 * Create an echo adapter.
 *
 * @param {{ delay?: number, maxMessages?: number }} [options]
 * @returns {import('../ports/ai-chat-port.mjs').AiChatPort}
 */
export function createEchoAdapter(options = {}) {
  const delay = options.delay ?? 0;
  const history = createMessageHistory({ maxMessages: options.maxMessages });

  /** @type {Set<Function>} */
  const listeners = new Set();

  /** @param {import('../ports/ai-chat-port.mjs').AiChatMessage} message */
  function notifyListeners(message) {
    for (const listener of listeners) {
      listener(message);
    }
  }

  /** @param {number} ms */
  function wait(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return {
    async sendMessage(message, _options) {
      const userMsg = {
        id: nextId(),
        role: /** @type {const} */ ('user'),
        content: message,
        timestamp: Date.now(),
      };
      history.addMessage(userMsg);
      notifyListeners(userMsg);

      await wait(delay);

      const echoContent = t('ai-chat.echo.prefix') + message;
      const assistantMsg = {
        id: nextId(),
        role: /** @type {const} */ ('assistant'),
        content: echoContent,
        timestamp: Date.now(),
      };
      history.addMessage(assistantMsg);
      notifyListeners(assistantMsg);

      return { message: assistantMsg };
    },

    async *streamMessage(message, _options) {
      const userMsg = {
        id: nextId(),
        role: /** @type {const} */ ('user'),
        content: message,
        timestamp: Date.now(),
      };
      history.addMessage(userMsg);
      notifyListeners(userMsg);

      const echoContent = t('ai-chat.echo.prefix') + message;
      const charDelay = delay > 0 ? Math.max(1, Math.floor(delay / echoContent.length)) : 0;

      for (let i = 0; i < echoContent.length; i++) {
        if (charDelay > 0) await wait(charDelay);
        const isLast = i === echoContent.length - 1;
        if (isLast) {
          const assistantMsg = {
            id: nextId(),
            role: /** @type {const} */ ('assistant'),
            content: echoContent,
            timestamp: Date.now(),
          };
          history.addMessage(assistantMsg);
          notifyListeners(assistantMsg);
          yield { delta: echoContent[i], done: true, message: assistantMsg };
        } else {
          yield { delta: echoContent[i], done: false };
        }
      }
    },

    getHistory() {
      return history.getMessages();
    },

    clearHistory() {
      history.clear();
    },

    /** @param {Function} listener */
    onMessage(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('Message listener must be a function');
      }
      listeners.add(listener);
    },

    /** @param {Function} listener */
    offMessage(listener) {
      listeners.delete(listener);
    },
  };
}
