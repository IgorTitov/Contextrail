/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide an AiChatPort-conformant adapter that communicates with any OpenAI-compatible chat completions endpoint via a configurable ApiClientPort, with pluggable request and response formatters.
 * @sidecar http-api-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * HTTP API adapter for AI chat endpoints.
 * Communicates with any OpenAI-compatible chat completions endpoint
 * through configurable request/response formatters.
 *
 * SpecRefs: TPL-074
 */

import { createMessageHistory } from '../domain/message-history.mjs';
import { t } from '../messages.mjs';

let idCounter = 0;

/** @returns {string} */
function nextId() {
  idCounter += 1;
  return `http_${idCounter}_${Date.now()}`;
}

/**
 * Default request formatter targeting OpenAI-compatible chat completions.
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {import('../ports/ai-chat-port.mjs').AiChatOptions} [options]
 * @param {string} [model]
 * @returns {object}
 */
function defaultFormatRequest(messages, options, model) {
  const body = { messages, model: options?.model || model };
  if (options?.temperature != null) body.temperature = options.temperature;
  if (options?.maxTokens != null) body.max_tokens = options.maxTokens;
  return body;
}

/**
 * Default response formatter for OpenAI-compatible chat completions.
 *
 * @param {any} data
 * @returns {{ content: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number } | null, model: string | null }}
 */
function defaultFormatResponse(data) {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content ?? '';
  const usage = data?.usage
    ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
        totalTokens: data.usage.total_tokens ?? 0,
      }
    : null;
  return { content, usage, model: data?.model ?? null };
}

/**
 * @typedef {Object} HttpApiAdapterConfig
 * @property {import('../../api-client/public-api.mjs').ApiClientPort} apiClient
 * @property {string} endpoint
 * @property {string} [model]
 * @property {(messages: Array<{ role: string, content: string }>, options?: import('../ports/ai-chat-port.mjs').AiChatOptions, model?: string) => object} [formatRequest]
 * @property {(data: any) => { content: string, usage: any, model: string | null }} [formatResponse]
 * @property {number} [maxMessages]
 */

/**
 * Create an HTTP API adapter for AI chat.
 *
 * @param {HttpApiAdapterConfig} config
 * @returns {import('../ports/ai-chat-port.mjs').AiChatPort}
 */
export function createHttpApiAdapter(config) {
  const { apiClient, endpoint, model } = config;
  const formatRequest = config.formatRequest || defaultFormatRequest;
  const formatResponse = config.formatResponse || defaultFormatResponse;
  const history = createMessageHistory({ maxMessages: config.maxMessages });

  /** @type {Set<Function>} */
  const listeners = new Set();

  /** @param {import('../ports/ai-chat-port.mjs').AiChatMessage} message */
  function notifyListeners(message) {
    for (const listener of listeners) {
      listener(message);
    }
  }

  return {
    async sendMessage(message, options) {
      const userMsg = {
        id: nextId(),
        role: /** @type {const} */ ('user'),
        content: message,
        timestamp: Date.now(),
      };
      history.addMessage(userMsg);
      notifyListeners(userMsg);

      // Build prompt context
      const promptMessages = history.toPromptContext();
      if (options?.systemPrompt) {
        promptMessages.unshift({ role: 'system', content: options.systemPrompt });
      }

      const body = formatRequest(promptMessages, options, model);
      const response = await apiClient.post(endpoint, body);

      if (!response.ok) {
        throw new Error(t('ai-chat.error.api_error', { status: response.status }));
      }

      const parsed = formatResponse(response.data);
      const assistantMsg = {
        id: nextId(),
        role: /** @type {const} */ ('assistant'),
        content: parsed.content,
        timestamp: Date.now(),
      };
      history.addMessage(assistantMsg);
      notifyListeners(assistantMsg);

      return {
        message: assistantMsg,
        usage: parsed.usage,
        model: parsed.model,
      };
    },

    async *streamMessage(message, options) {
      // Fallback: use sendMessage and simulate streaming from the full response
      const response = await this.sendMessage(message, options);
      const content = response.message.content;

      for (let i = 0; i < content.length; i++) {
        const isLast = i === content.length - 1;
        if (isLast) {
          yield { delta: content[i], done: true, message: response.message };
        } else {
          yield { delta: content[i], done: false };
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
