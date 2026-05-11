/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of local-llm-test in this repository.
 * @sidecar local-llm.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for local-llm.feature.
 * Proves user-visible local LLM behavior through the local-llm module public API.
 * Uses injected test doubles (_importLib, _checkWebGPU) since Node.js has no WebGPU.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertLocalLlmPort,
  createWebLlmAdapter,
  createModelCacheManager,
} from '../../modules/local-llm/public-api.mjs';

const feature = readFileSync(new URL('./features/local-llm.feature', import.meta.url), 'utf8');

/**
 * Create a mock WebLLM library for testing without real WebGPU.
 * Mirrors the engine shape used by the real webllm-adapter.
 */
function createMockWebLlmLib() {
  return {
    CreateMLCEngine: async (_model, opts) => {
      if (opts?.initProgressCallback) {
        opts.initProgressCallback({ progress: 0.5, text: 'Loading...' });
        opts.initProgressCallback({ progress: 1.0, text: 'Done' });
      }
      return {
        async chat(messages) {
          const last = messages[messages.length - 1]?.content || '';
          return {
            choices: [{ message: { role: 'assistant', content: `Echo: ${last}` } }],
            usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
          };
        },
        async *chatStream(messages) {
          const content = `Echo: ${messages[messages.length - 1]?.content || ''}`;
          for (const ch of content) {
            yield { choices: [{ delta: { content: ch } }] };
          }
        },
        async unload() {},
      };
    },
  };
}

function mockOpts() {
  return {
    _importLib: async () => createMockWebLlmLib(),
    _checkWebGPU: () => true,
  };
}

describe('Feature: Local LLM inference', () => {
  /** @type {ReturnType<typeof createWebLlmAdapter>} */
  let adapter;

  beforeEach(() => {
    adapter = createWebLlmAdapter(mockOpts());
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Local LLM inference'));
    assert.ok(feature.includes('Scenario: Load a model with progress'));
    assert.ok(feature.includes('Scenario: Send a message after loading'));
    assert.ok(feature.includes('Scenario: Unload a model'));
    assert.ok(feature.includes('Scenario: Send message without loaded model fails'));
    assert.ok(feature.includes('Scenario: Model cache manager lists cached models'));
  });

  test('Scenario: Load a model with progress', async () => {
    // When the user loads model "test-model"
    const progressUpdates = [];
    await adapter.loadModel('test-model', {
      onProgress: (p) => progressUpdates.push(p),
    });

    // Then the model is loaded
    assert.equal(adapter.isModelLoaded(), true);

    // And the progress callback received at least one update
    assert.ok(progressUpdates.length > 0, 'Should receive progress updates');
  });

  test('Scenario: Send a message after loading', async () => {
    // Given model "test-model" is loaded
    await adapter.loadModel('test-model');

    // When the user sends message "Hello"
    const response = await adapter.sendMessage('Hello');

    // Then the adapter returns a non-empty response
    assert.ok(response.message.content.length > 0);
    assert.equal(response.message.role, 'assistant');
  });

  test('Scenario: Unload a model', async () => {
    // Given model "test-model" is loaded
    await adapter.loadModel('test-model');
    assert.equal(adapter.isModelLoaded(), true);

    // When the user unloads the model
    await adapter.unloadModel();

    // Then no model is loaded
    assert.equal(adapter.isModelLoaded(), false);
  });

  test('Scenario: Send message without loaded model fails', async () => {
    // Given no model is loaded
    assert.equal(adapter.isModelLoaded(), false);

    // When the user sends message "Hello"
    // Then the adapter returns an error
    await assert.rejects(() => adapter.sendMessage('Hello'), /model.*loaded/i);
  });

  test('Scenario: Model cache manager lists cached models', async () => {
    // Given the model cache manager is active
    const cache = createModelCacheManager();

    // Then the cache returns a list of cached models
    const models = await cache.getCachedModels();
    assert.ok(Array.isArray(models));
  });
});
