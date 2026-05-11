/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a WebLLM adapter for in-browser LLM inference via WebGPU, dynamically loading the web-llm library and satisfying the full LocalLlmPort and AiChatPort contracts.
 * @sidecar webllm-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * WebLLM adapter for in-browser LLM inference via WebGPU.
 * Dynamically imports web-llm at runtime.
 *
 * SpecRefs: TPL-081
 */

import { t } from '../messages.mjs';

/**
 * Minimal message history factory — inlined to avoid cross-module relative import.
 * Mirrors the subset of modules/ai-chat/domain/message-history.mjs used by adapters.
 * Integration code may inject the real factory via options._createMessageHistory.
 *
 * @param {{ maxMessages?: number }} [opts]
 */
function defaultCreateMessageHistory(opts = {}) {
  const max = opts.maxMessages ?? 100;
  /** @type {any[]} */
  let msgs = [];
  return {
    /** @param {any} msg */
    addMessage(msg) {
      msgs.push(msg);
      if (msgs.length > max) msgs = msgs.slice(-max);
    },
    getMessages() {
      return [...msgs];
    },
    clear() {
      msgs = [];
    },
    toPromptContext() {
      return msgs.map((m) => ({ role: m.role, content: m.content }));
    },
  };
}

let idCounter = 0;

/** @returns {string} */
function nextId() {
  idCounter += 1;
  return `webllm_${idCounter}_${Date.now()}`;
}

/**
 * @typedef {Object} WebLlmAdapterOptions
 * @property {number} [maxMessages]
 * @property {() => Promise<any>} [_importLib] - Internal: injected loader for testing
 * @property {() => boolean} [_checkWebGPU] - Internal: injected WebGPU check for testing
 * @property {(opts?: { maxMessages?: number }) => any} [_createMessageHistory] - Internal: injected message history factory
 */

/**
 * Create a WebLLM adapter for in-browser LLM inference.
 *
 * @param {WebLlmAdapterOptions} [options]
 * @returns {import('../ports/local-llm-port.mjs').LocalLlmPort}
 */
export function createWebLlmAdapter(options = {}) {
  const factory = options._createMessageHistory || defaultCreateMessageHistory;
  const history = factory({ maxMessages: options.maxMessages });
  /** @type {Set<Function>} */
  const listeners = new Set();
  /** @type {any} */
  let engine = null;
  let loaded = false;

  const importLib = options._importLib || (() => import('web-llm'));
  const checkWebGPU =
    options._checkWebGPU || (() => typeof navigator !== 'undefined' && 'gpu' in navigator);

  /** @param {import('../../ai-chat/ports/ai-chat-port.mjs').AiChatMessage} message */
  function notifyListeners(message) {
    for (const listener of listeners) {
      listener(message);
    }
  }

  return {
    async loadModel(modelId, loadOptions) {
      if (!checkWebGPU()) {
        throw new Error(t('local-llm.error.webgpu_unavailable'));
      }

      const onProgress = loadOptions?.onProgress;

      if (onProgress) {
        onProgress({ stage: 'downloading', progress: 0 });
      }

      let lib;
      try {
        lib = await importLib();
      } catch (_err) {
        throw new Error(t('local-llm.error.webgpu_unavailable'), { cause: _err });
      }

      if (onProgress) {
        onProgress({ stage: 'initializing', progress: 0 });
      }

      engine = await lib.CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          if (onProgress) {
            const progress = typeof report.progress === 'number' ? report.progress : 0;
            onProgress({
              stage: progress < 1 ? 'downloading' : 'initializing',
              progress,
              message: report.text || undefined,
            });
          }
        },
        ...(loadOptions?.contextLength ? { context_window_size: loadOptions.contextLength } : {}),
      });

      loaded = true;

      if (onProgress) {
        onProgress({ stage: 'ready', progress: 1 });
      }
    },

    async unloadModel() {
      if (engine) {
        await engine.unload();
        engine = null;
      }
      loaded = false;
    },

    isModelLoaded() {
      return loaded;
    },

    async sendMessage(message, chatOptions) {
      if (!loaded || !engine) {
        throw new Error(t('local-llm.error.no_model'));
      }

      const userMsg = {
        id: nextId(),
        role: /** @type {const} */ ('user'),
        content: message,
        timestamp: Date.now(),
      };
      history.addMessage(userMsg);
      notifyListeners(userMsg);

      const promptMessages = history.toPromptContext();
      if (chatOptions?.systemPrompt) {
        promptMessages.unshift({ role: 'system', content: chatOptions.systemPrompt });
      }

      const result = await engine.chat(promptMessages, {
        ...(chatOptions?.temperature != null ? { temperature: chatOptions.temperature } : {}),
        ...(chatOptions?.maxTokens != null ? { max_tokens: chatOptions.maxTokens } : {}),
      });

      const choice = result?.choices?.[0];
      const content = choice?.message?.content ?? '';
      const usage = result?.usage
        ? {
            promptTokens: result.usage.prompt_tokens ?? 0,
            completionTokens: result.usage.completion_tokens ?? 0,
            totalTokens: result.usage.total_tokens ?? 0,
          }
        : undefined;

      const assistantMsg = {
        id: nextId(),
        role: /** @type {const} */ ('assistant'),
        content,
        timestamp: Date.now(),
      };
      history.addMessage(assistantMsg);
      notifyListeners(assistantMsg);

      return {
        message: assistantMsg,
        usage,
        model: result?.model ?? undefined,
      };
    },

    async *streamMessage(message, chatOptions) {
      if (!loaded || !engine) {
        throw new Error(t('local-llm.error.no_model'));
      }

      const userMsg = {
        id: nextId(),
        role: /** @type {const} */ ('user'),
        content: message,
        timestamp: Date.now(),
      };
      history.addMessage(userMsg);
      notifyListeners(userMsg);

      const promptMessages = history.toPromptContext();
      if (chatOptions?.systemPrompt) {
        promptMessages.unshift({ role: 'system', content: chatOptions.systemPrompt });
      }

      let fullContent = '';
      const stream = engine.chatStream(promptMessages, {
        ...(chatOptions?.temperature != null ? { temperature: chatOptions.temperature } : {}),
        ...(chatOptions?.maxTokens != null ? { max_tokens: chatOptions.maxTokens } : {}),
      });

      const chunks = [];
      for await (const chunk of stream) {
        const delta = chunk?.choices?.[0]?.delta?.content ?? '';
        fullContent += delta;
        chunks.push(delta);
      }

      // Yield accumulated chunks, marking the last one as done
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        if (isLast) {
          const assistantMsg = {
            id: nextId(),
            role: /** @type {const} */ ('assistant'),
            content: fullContent,
            timestamp: Date.now(),
          };
          history.addMessage(assistantMsg);
          notifyListeners(assistantMsg);
          yield { delta: chunks[i], done: true, message: assistantMsg };
        } else {
          yield { delta: chunks[i], done: false };
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
