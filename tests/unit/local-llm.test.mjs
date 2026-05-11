/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove pure-logic contracts for the local-llm module — port assertion, WebLLM adapter, Transformers.js adapter, and model cache manager.
 * @sidecar local-llm.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the local-llm module.
 * All imports go through the public API.
 *
 * SpecRefs: TPL-080; TPL-081; TPL-082; TPL-083; TPL-084
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertLocalLlmPort,
  createWebLlmAdapter,
  createTransformersAdapter,
  createModelCacheManager,
} from '../../modules/local-llm/public-api.mjs';

import { assertAiChatPort } from '../../modules/ai-chat/public-api.mjs';

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('assertLocalLlmPort', () => {
  test('rejects null', () => {
    assert.throws(() => assertLocalLlmPort(null), /non-null object/);
  });

  test('rejects non-object', () => {
    assert.throws(() => assertLocalLlmPort(42), /non-null object/);
  });

  test('rejects adapter missing AiChatPort method', () => {
    assert.throws(
      () =>
        assertLocalLlmPort({
          sendMessage() {},
          // missing streamMessage etc.
          loadModel() {},
          unloadModel() {},
          isModelLoaded() {},
        }),
      /must implement/,
    );
  });

  test('rejects adapter missing loadModel', () => {
    assert.throws(
      () =>
        assertLocalLlmPort({
          sendMessage() {},
          streamMessage() {},
          getHistory() {},
          clearHistory() {},
          onMessage() {},
          offMessage() {},
          // missing loadModel
          unloadModel() {},
          isModelLoaded() {},
        }),
      /must implement loadModel/,
    );
  });

  test('rejects adapter missing unloadModel', () => {
    assert.throws(
      () =>
        assertLocalLlmPort({
          sendMessage() {},
          streamMessage() {},
          getHistory() {},
          clearHistory() {},
          onMessage() {},
          offMessage() {},
          loadModel() {},
          // missing unloadModel
          isModelLoaded() {},
        }),
      /must implement unloadModel/,
    );
  });

  test('rejects adapter missing isModelLoaded', () => {
    assert.throws(
      () =>
        assertLocalLlmPort({
          sendMessage() {},
          streamMessage() {},
          getHistory() {},
          clearHistory() {},
          onMessage() {},
          offMessage() {},
          loadModel() {},
          unloadModel() {},
          // missing isModelLoaded
        }),
      /must implement isModelLoaded/,
    );
  });

  test('accepts a fully conformant adapter', () => {
    const adapter = {
      sendMessage() {},
      streamMessage() {},
      getHistory() {},
      clearHistory() {},
      onMessage() {},
      offMessage() {},
      loadModel() {},
      unloadModel() {},
      isModelLoaded() {},
    };
    assert.doesNotThrow(() => assertLocalLlmPort(adapter));
  });

  test('an adapter passing assertLocalLlmPort also passes assertAiChatPort', () => {
    const adapter = {
      sendMessage() {},
      streamMessage() {},
      getHistory() {},
      clearHistory() {},
      onMessage() {},
      offMessage() {},
      loadModel() {},
      unloadModel() {},
      isModelLoaded() {},
    };
    assert.doesNotThrow(() => assertLocalLlmPort(adapter));
    assert.doesNotThrow(() => assertAiChatPort(adapter));
  });
});

// ---------------------------------------------------------------------------
// Helpers: mock WebLLM engine
// ---------------------------------------------------------------------------

function createMockWebLlmLib() {
  let loaded = false;
  let loadedModelId = null;

  return {
    CreateMLCEngine: async (modelId, opts) => {
      if (opts?.initProgressCallback) {
        opts.initProgressCallback({ progress: 0.5, text: 'Downloading...' });
        opts.initProgressCallback({ progress: 1.0, text: 'Ready' });
      }
      loaded = true;
      loadedModelId = modelId;

      return {
        async chat(messages, _opts) {
          return {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: `WebLLM: ${messages[messages.length - 1].content}`,
                },
              },
            ],
            usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
            model: loadedModelId,
          };
        },
        async *chatStream(messages, _opts) {
          const content = `WebLLM: ${messages[messages.length - 1].content}`;
          for (let i = 0; i < content.length; i++) {
            yield {
              choices: [{ delta: { content: content[i] } }],
            };
          }
        },
        async unload() {
          loaded = false;
          loadedModelId = null;
        },
      };
    },
    _isLoaded: () => loaded,
  };
}

// ---------------------------------------------------------------------------
// WebLLM Adapter
// ---------------------------------------------------------------------------

describe('createWebLlmAdapter', () => {
  /** @returns {{ _importLib: () => Promise<any>, _checkWebGPU: () => boolean }} */
  function mockOpts() {
    const mockLib = createMockWebLlmLib();
    return { _importLib: async () => mockLib, _checkWebGPU: () => true };
  }

  test('passes both port assertions', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    assert.doesNotThrow(() => assertLocalLlmPort(adapter));
    assert.doesNotThrow(() => assertAiChatPort(adapter));
  });

  test('isModelLoaded returns false before loadModel', () => {
    const adapter = createWebLlmAdapter(mockOpts());
    assert.equal(adapter.isModelLoaded(), false);
  });

  test('loadModel loads and sets isModelLoaded to true', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    assert.equal(adapter.isModelLoaded(), true);
  });

  test('loadModel reports progress via onProgress callback', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    const progressUpdates = [];
    await adapter.loadModel('test-model', {
      onProgress: (p) => progressUpdates.push(p),
    });
    assert.ok(progressUpdates.length > 0, 'Should report progress');
    assert.ok(progressUpdates.some((p) => p.stage === 'downloading' || p.stage === 'initializing'));
  });

  test('sendMessage throws if no model loaded', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await assert.rejects(() => adapter.sendMessage('Hello'), /model.*loaded/i);
  });

  test('sendMessage returns response after model is loaded', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    const response = await adapter.sendMessage('Hello');
    assert.equal(response.message.role, 'assistant');
    assert.ok(response.message.content.includes('Hello'));
    assert.ok(response.message.id);
    assert.ok(response.message.timestamp > 0);
  });

  test('sendMessage stores messages in history', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    await adapter.sendMessage('Test');
    const history = adapter.getHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].role, 'user');
    assert.equal(history[1].role, 'assistant');
  });

  test('streamMessage throws if no model loaded', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await assert.rejects(async () => {
      for await (const _chunk of adapter.streamMessage('Hello')) {
        // should not reach here
      }
    }, /model.*loaded/i);
  });

  test('streamMessage yields chunks', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    const chunks = [];
    for await (const chunk of adapter.streamMessage('Hi')) {
      chunks.push(chunk);
    }
    assert.ok(chunks.length > 1, 'Should yield multiple chunks');
    assert.equal(chunks[chunks.length - 1].done, true);
    assert.ok(chunks[chunks.length - 1].message, 'Final chunk should include message');
  });

  test('message listeners are notified', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    const received = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.sendMessage('Test');
    assert.equal(received.length, 2);
    assert.equal(received[0].role, 'user');
    assert.equal(received[1].role, 'assistant');
  });

  test('offMessage removes listener', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    let count = 0;
    const listener = () => {
      count++;
    };
    adapter.onMessage(listener);
    adapter.offMessage(listener);
    await adapter.sendMessage('Noop');
    assert.equal(count, 0);
  });

  test('unloadModel releases resources', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    assert.equal(adapter.isModelLoaded(), true);
    await adapter.unloadModel();
    assert.equal(adapter.isModelLoaded(), false);
  });

  test('clearHistory empties history', async () => {
    const adapter = createWebLlmAdapter(mockOpts());
    await adapter.loadModel('test-model');
    await adapter.sendMessage('A');
    adapter.clearHistory();
    assert.deepEqual(adapter.getHistory(), []);
  });

  test('separate factory calls are independent', async () => {
    const opts = mockOpts();
    const a = createWebLlmAdapter(opts);
    const b = createWebLlmAdapter(opts);
    await a.loadModel('test-model');
    await a.sendMessage('Only A');
    assert.equal(a.getHistory().length, 2);
    assert.equal(b.getHistory().length, 0);
    assert.equal(b.isModelLoaded(), false);
  });

  test('factory does not trigger model loading', () => {
    const adapter = createWebLlmAdapter(mockOpts());
    assert.equal(adapter.isModelLoaded(), false);
  });

  test('loadModel throws when WebGPU unavailable', async () => {
    const adapter = createWebLlmAdapter({
      _importLib: async () => {
        throw new Error('WebGPU not available');
      },
      _checkWebGPU: () => false,
    });
    await assert.rejects(() => adapter.loadModel('test-model'), /WebGPU/i);
  });
});

// ---------------------------------------------------------------------------
// Helpers: mock Transformers.js library
// ---------------------------------------------------------------------------

function createMockTransformersLib() {
  return {
    pipeline: async (task, modelId, opts) => {
      if (opts?.progress_callback) {
        opts.progress_callback({ status: 'progress', progress: 50 });
        opts.progress_callback({ status: 'done', progress: 100 });
      }

      const pipe = async (messages, genOpts) => {
        const lastContent =
          typeof messages === 'string' ? messages : messages[messages.length - 1].content;
        const content = `Transformers: ${lastContent}`;

        if (genOpts?.callback_function) {
          for (const char of content) {
            genOpts.callback_function({ token_str: char });
          }
        }

        return [{ generated_text: content }];
      };
      pipe.dispose = () => {};
      return pipe;
    },
  };
}

// ---------------------------------------------------------------------------
// Transformers.js Adapter
// ---------------------------------------------------------------------------

describe('createTransformersAdapter', () => {
  /** @returns {{ _importLib: () => Promise<any>, _checkWasm: () => boolean }} */
  function mockOpts() {
    const mockLib = createMockTransformersLib();
    return { _importLib: async () => mockLib, _checkWasm: () => true };
  }

  test('passes both port assertions', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    assert.doesNotThrow(() => assertLocalLlmPort(adapter));
    assert.doesNotThrow(() => assertAiChatPort(adapter));
  });

  test('isModelLoaded returns false before loadModel', () => {
    const adapter = createTransformersAdapter(mockOpts());
    assert.equal(adapter.isModelLoaded(), false);
  });

  test('loadModel loads and sets isModelLoaded to true', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    assert.equal(adapter.isModelLoaded(), true);
  });

  test('loadModel reports progress via onProgress callback', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    const progressUpdates = [];
    await adapter.loadModel('test-model', {
      onProgress: (p) => progressUpdates.push(p),
    });
    assert.ok(progressUpdates.length > 0, 'Should report progress');
  });

  test('sendMessage throws if no model loaded', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await assert.rejects(() => adapter.sendMessage('Hello'), /model.*loaded/i);
  });

  test('sendMessage returns response after model is loaded', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    const response = await adapter.sendMessage('Hello');
    assert.equal(response.message.role, 'assistant');
    assert.ok(response.message.content.includes('Hello'));
    assert.ok(response.message.id);
    assert.ok(response.message.timestamp > 0);
  });

  test('sendMessage stores messages in history', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    await adapter.sendMessage('Test');
    const history = adapter.getHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].role, 'user');
    assert.equal(history[1].role, 'assistant');
  });

  test('streamMessage throws if no model loaded', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await assert.rejects(async () => {
      for await (const _chunk of adapter.streamMessage('Hello')) {
        // should not reach here
      }
    }, /model.*loaded/i);
  });

  test('streamMessage yields chunks', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    const chunks = [];
    for await (const chunk of adapter.streamMessage('Hi')) {
      chunks.push(chunk);
    }
    assert.ok(chunks.length > 1, 'Should yield multiple chunks');
    assert.equal(chunks[chunks.length - 1].done, true);
    assert.ok(chunks[chunks.length - 1].message, 'Final chunk should include message');
  });

  test('message listeners are notified', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    const received = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.sendMessage('Test');
    assert.equal(received.length, 2);
    assert.equal(received[0].role, 'user');
    assert.equal(received[1].role, 'assistant');
  });

  test('unloadModel releases resources', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    assert.equal(adapter.isModelLoaded(), true);
    await adapter.unloadModel();
    assert.equal(adapter.isModelLoaded(), false);
  });

  test('clearHistory empties history', async () => {
    const adapter = createTransformersAdapter(mockOpts());
    await adapter.loadModel('test-model');
    await adapter.sendMessage('A');
    adapter.clearHistory();
    assert.deepEqual(adapter.getHistory(), []);
  });

  test('separate factory calls are independent', async () => {
    const opts = mockOpts();
    const a = createTransformersAdapter(opts);
    const b = createTransformersAdapter(opts);
    await a.loadModel('test-model');
    await a.sendMessage('Only A');
    assert.equal(a.getHistory().length, 2);
    assert.equal(b.getHistory().length, 0);
    assert.equal(b.isModelLoaded(), false);
  });

  test('factory does not trigger model loading', () => {
    const adapter = createTransformersAdapter(mockOpts());
    assert.equal(adapter.isModelLoaded(), false);
  });

  test('loadModel throws when WASM unavailable', async () => {
    const adapter = createTransformersAdapter({
      _importLib: async () => {
        throw new Error('WASM not available');
      },
      _checkWasm: () => false,
    });
    await assert.rejects(() => adapter.loadModel('test-model'), /WASM/i);
  });
});

// ---------------------------------------------------------------------------
// Model Cache Manager
// ---------------------------------------------------------------------------

describe('createModelCacheManager', () => {
  /** @returns {any} */
  function createMockCaches() {
    const stores = new Map();
    return {
      keys: async () => [...stores.keys()].map((k) => ({ name: k })),
      open: async (name) => {
        if (!stores.has(name)) stores.set(name, new Map());
        const store = stores.get(name);
        return {
          keys: async () => [...store.keys()].map((k) => ({ url: k })),
          put: async (key, val) => store.set(key, val),
          delete: async (key) => store.delete(key),
        };
      },
      delete: async (name) => stores.delete(name),
      _stores: stores,
    };
  }

  function createMockStorage() {
    return {
      estimate: async () => ({ usage: 1024 * 1024, quota: 1024 * 1024 * 100 }),
    };
  }

  test('getAvailableModels returns immutable array of model configs', () => {
    const manager = createModelCacheManager({
      _caches: createMockCaches(),
      _storage: createMockStorage(),
    });
    const models = manager.getAvailableModels();
    assert.ok(Array.isArray(models));
    assert.ok(models.length > 0, 'Should have built-in model configs');
    // Check shape
    const first = models[0];
    assert.ok(first.modelId, 'Should have modelId');
    assert.ok(first.displayName, 'Should have displayName');
    assert.ok(typeof first.sizeBytes === 'number', 'Should have sizeBytes');
    assert.ok(
      first.backend === 'webllm' || first.backend === 'transformers',
      'Should have valid backend',
    );
    // Immutability
    const m1 = manager.getAvailableModels();
    const m2 = manager.getAvailableModels();
    assert.notStrictEqual(m1, m2);
  });

  test('getCachedModels returns empty array initially', async () => {
    const manager = createModelCacheManager({
      _caches: createMockCaches(),
      _storage: createMockStorage(),
    });
    const cached = await manager.getCachedModels();
    assert.deepEqual(cached, []);
  });

  test('isModelCached returns false for uncached model', async () => {
    const manager = createModelCacheManager({
      _caches: createMockCaches(),
      _storage: createMockStorage(),
    });
    const result = await manager.isModelCached('nonexistent');
    assert.equal(result, false);
  });

  test('estimateStorageUsage returns bytes used and available', async () => {
    const manager = createModelCacheManager({
      _caches: createMockCaches(),
      _storage: createMockStorage(),
    });
    const usage = await manager.estimateStorageUsage();
    assert.ok(typeof usage.bytesUsed === 'number');
    assert.ok(typeof usage.bytesAvailable === 'number');
  });

  test('clearModelCache does not throw on empty cache', async () => {
    const manager = createModelCacheManager({
      _caches: createMockCaches(),
      _storage: createMockStorage(),
    });
    await assert.doesNotReject(() => manager.clearModelCache());
  });

  test('clearModelCache with specific model id does not throw', async () => {
    const manager = createModelCacheManager({
      _caches: createMockCaches(),
      _storage: createMockStorage(),
    });
    await assert.doesNotReject(() => manager.clearModelCache('test-model'));
  });

  test('handles missing storage APIs gracefully', async () => {
    const manager = createModelCacheManager({ _caches: null, _storage: null });
    const cached = await manager.getCachedModels();
    assert.deepEqual(cached, []);
    const usage = await manager.estimateStorageUsage();
    assert.equal(usage.bytesUsed, 0);
    assert.equal(usage.bytesAvailable, 0);
  });

  test('returned arrays are immutable copies', async () => {
    const manager = createModelCacheManager({
      _caches: createMockCaches(),
      _storage: createMockStorage(),
    });
    const c1 = await manager.getCachedModels();
    const c2 = await manager.getCachedModels();
    assert.notStrictEqual(c1, c2);
  });
});
