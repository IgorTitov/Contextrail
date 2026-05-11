/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a Transformers.js adapter for in-browser LLM inference via WASM, dynamically loading @xenova/transformers and satisfying the full LocalLlmPort and AiChatPort contracts.
 * @sidecar transformers-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * Transformers.js adapter for in-browser LLM inference via WASM.
 * Dynamically imports @xenova/transformers at runtime.
 *
 * SpecRefs: TPL-082
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
  return `transformers_${idCounter}_${Date.now()}`;
}

/**
 * @typedef {Object} TransformersAdapterOptions
 * @property {number} [maxMessages]
 * @property {() => Promise<any>} [_importLib] - Internal: injected loader for testing
 * @property {() => boolean} [_checkWasm] - Internal: injected WASM check for testing
 * @property {(opts?: { maxMessages?: number }) => any} [_createMessageHistory] - Internal: injected message history factory
 */

/**
 * Create a Transformers.js adapter for in-browser LLM inference.
 *
 * @param {TransformersAdapterOptions} [options]
 * @returns {import('../ports/local-llm-port.mjs').LocalLlmPort}
 */
export function createTransformersAdapter(options = {}) {
  const factory = options._createMessageHistory || defaultCreateMessageHistory;
  const history = factory({ maxMessages: options.maxMessages });
  /** @type {Set<Function>} */
  const listeners = new Set();
  /** @type {any} */
  let pipeline = null;
  let loaded = false;

  const importLib = options._importLib || (() => import('@xenova/transformers'));
  const checkWasm = options._checkWasm || (() => typeof WebAssembly !== 'undefined');

  /** @param {import('../../ai-chat/ports/ai-chat-port.mjs').AiChatMessage} message */
  function notifyListeners(message) {
    for (const listener of listeners) {
      listener(message);
    }
  }

  return {
    async loadModel(modelId, loadOptions) {
      if (!checkWasm()) {
        throw new Error(t('local-llm.error.wasm_unavailable'));
      }

      const onProgress = loadOptions?.onProgress;

      if (onProgress) {
        onProgress({ stage: 'downloading', progress: 0 });
      }

      let lib;
      try {
        lib = await importLib();
      } catch (_err) {
        throw new Error(t('local-llm.error.wasm_unavailable'), { cause: _err });
      }

      if (onProgress) {
        onProgress({ stage: 'initializing', progress: 0 });
      }

      pipeline = await lib.pipeline('text-generation', modelId, {
        progress_callback: (report) => {
          if (onProgress) {
            const progress = typeof report.progress === 'number' ? report.progress / 100 : 0;
            onProgress({
              stage: report.status === 'done' ? 'initializing' : 'downloading',
              progress,
              message: report.status || undefined,
            });
          }
        },
        ...(loadOptions?.quantization ? { quantized: true } : {}),
      });

      loaded = true;

      if (onProgress) {
        onProgress({ stage: 'ready', progress: 1 });
      }
    },

    async unloadModel() {
      if (pipeline && typeof pipeline.dispose === 'function') {
        pipeline.dispose();
      }
      pipeline = null;
      loaded = false;
    },

    isModelLoaded() {
      return loaded;
    },

    async sendMessage(message, chatOptions) {
      if (!loaded || !pipeline) {
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

      const result = await pipeline(promptMessages, {
        ...(chatOptions?.temperature != null ? { temperature: chatOptions.temperature } : {}),
        ...(chatOptions?.maxTokens != null ? { max_new_tokens: chatOptions.maxTokens } : {}),
      });

      const content = result?.[0]?.generated_text ?? '';

      const assistantMsg = {
        id: nextId(),
        role: /** @type {const} */ ('assistant'),
        content,
        timestamp: Date.now(),
      };
      history.addMessage(assistantMsg);
      notifyListeners(assistantMsg);

      return { message: assistantMsg };
    },

    async *streamMessage(message, chatOptions) {
      if (!loaded || !pipeline) {
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

      // Collect streaming tokens
      const tokens = [];
      await pipeline(promptMessages, {
        ...(chatOptions?.temperature != null ? { temperature: chatOptions.temperature } : {}),
        ...(chatOptions?.maxTokens != null ? { max_new_tokens: chatOptions.maxTokens } : {}),
        callback_function: (output) => {
          if (output?.token_str) {
            tokens.push(output.token_str);
          }
        },
      });

      const fullContent = tokens.join('');

      // Yield tokens, marking the last one as done
      for (let i = 0; i < tokens.length; i++) {
        const isLast = i === tokens.length - 1;
        if (isLast) {
          const assistantMsg = {
            id: nextId(),
            role: /** @type {const} */ ('assistant'),
            content: fullContent,
            timestamp: Date.now(),
          };
          history.addMessage(assistantMsg);
          notifyListeners(assistantMsg);
          yield { delta: tokens[i], done: true, message: assistantMsg };
        } else {
          yield { delta: tokens[i], done: false };
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
