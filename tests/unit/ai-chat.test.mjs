/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the behavioral contracts of all ai-chat module components — port assertion, echo adapter, http-api adapter, and message history — using only the public API.
 * @sidecar ai-chat.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the ai-chat module.
 * All imports go through the public API.
 *
 * SpecRefs: TPL-072; TPL-073; TPL-074; TPL-075
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertAiChatPort,
  createEchoAdapter,
  createHttpApiAdapter,
  createMessageHistory,
} from '../../modules/ai-chat/public-api.mjs';

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('assertAiChatPort', () => {
  test('rejects null', () => {
    assert.throws(() => assertAiChatPort(null), /non-null object/);
  });

  test('rejects non-object', () => {
    assert.throws(() => assertAiChatPort('string'), /non-null object/);
  });

  test('rejects incomplete adapter (missing method)', () => {
    assert.throws(
      () => assertAiChatPort({ sendMessage() {}, streamMessage() {} }),
      /must implement/,
    );
  });

  test('accepts a valid adapter', () => {
    const adapter = {
      sendMessage() {},
      streamMessage() {},
      getHistory() {},
      clearHistory() {},
      onMessage() {},
      offMessage() {},
    };
    assert.doesNotThrow(() => assertAiChatPort(adapter));
  });
});

// ---------------------------------------------------------------------------
// Echo adapter
// ---------------------------------------------------------------------------

describe('createEchoAdapter', () => {
  test('passes port assertion', () => {
    const adapter = createEchoAdapter();
    assert.doesNotThrow(() => assertAiChatPort(adapter));
  });

  test('sendMessage echoes with prefix', async () => {
    const adapter = createEchoAdapter();
    const response = await adapter.sendMessage('Hello');
    assert.equal(response.message.role, 'assistant');
    assert.ok(response.message.content.includes('Hello'));
    assert.ok(response.message.id);
    assert.ok(response.message.timestamp > 0);
  });

  test('sendMessage stores both user and assistant messages in history', async () => {
    const adapter = createEchoAdapter();
    await adapter.sendMessage('Test');
    const history = adapter.getHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].role, 'user');
    assert.equal(history[0].content, 'Test');
    assert.equal(history[1].role, 'assistant');
  });

  test('streamMessage yields characters incrementally', async () => {
    const adapter = createEchoAdapter({ delay: 0 });
    const chunks = [];
    for await (const chunk of adapter.streamMessage('Hi')) {
      chunks.push(chunk);
    }
    assert.ok(chunks.length > 1, 'Should yield multiple chunks');
    assert.equal(chunks[chunks.length - 1].done, true);
    assert.ok(chunks[chunks.length - 1].message, 'Final chunk should include message');
    // Non-final chunks should have done=false
    for (let i = 0; i < chunks.length - 1; i++) {
      assert.equal(chunks[i].done, false);
    }
  });

  test('clearHistory empties the history', async () => {
    const adapter = createEchoAdapter();
    await adapter.sendMessage('A');
    adapter.clearHistory();
    assert.deepEqual(adapter.getHistory(), []);
  });

  test('message listeners are notified for user and assistant messages', async () => {
    const adapter = createEchoAdapter();
    /** @type {any[]} */
    const received = [];
    adapter.onMessage((msg) => received.push(msg));

    await adapter.sendMessage('Ping');
    assert.equal(received.length, 2);
    assert.equal(received[0].role, 'user');
    assert.equal(received[1].role, 'assistant');
  });

  test('offMessage removes listener', async () => {
    const adapter = createEchoAdapter();
    let count = 0;
    const listener = () => {
      count++;
    };
    adapter.onMessage(listener);
    adapter.offMessage(listener);

    await adapter.sendMessage('Noop');
    assert.equal(count, 0);
  });

  test('separate factory calls are independent', async () => {
    const a = createEchoAdapter();
    const b = createEchoAdapter();
    await a.sendMessage('Only A');
    assert.equal(a.getHistory().length, 2);
    assert.equal(b.getHistory().length, 0);
  });

  test('configurable delay works', async () => {
    const adapter = createEchoAdapter({ delay: 50 });
    const start = Date.now();
    await adapter.sendMessage('Slow');
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 40, `Expected >= 40ms delay, got ${elapsed}ms`);
  });
});

// ---------------------------------------------------------------------------
// HttpApiAdapter
// ---------------------------------------------------------------------------

describe('createHttpApiAdapter', () => {
  /** @returns {any} */
  function createMockApiClient() {
    let lastPostUrl = '';
    let lastPostBody = null;
    let mockResponse = {
      status: 200,
      data: {
        choices: [
          {
            message: { role: 'assistant', content: 'Mock response' },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'mock-model',
      },
      headers: {},
      ok: true,
    };
    return {
      _lastPostUrl: () => lastPostUrl,
      _lastPostBody: () => lastPostBody,
      _setMockResponse: (r) => {
        mockResponse = r;
      },
      async get() {
        return { status: 200, data: null, headers: {}, ok: true };
      },
      async post(url, body) {
        lastPostUrl = url;
        lastPostBody = body;
        return mockResponse;
      },
      async put() {
        return { status: 200, data: null, headers: {}, ok: true };
      },
      async delete() {
        return { status: 200, data: null, headers: {}, ok: true };
      },
      setBaseUrl() {},
      setHeader() {},
      removeHeader() {},
    };
  }

  test('passes port assertion', () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    assert.doesNotThrow(() => assertAiChatPort(adapter));
  });

  test('sendMessage POSTs to configured endpoint', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/v1/chat/completions' });
    await adapter.sendMessage('Hello AI');
    assert.equal(api._lastPostUrl(), '/v1/chat/completions');
  });

  test('sendMessage sends messages array in request body', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    await adapter.sendMessage('Hello');
    const body = api._lastPostBody();
    assert.ok(body.messages, 'Request body should have messages array');
    assert.ok(Array.isArray(body.messages));
    // Should include the user message
    const userMsg = body.messages.find((m) => m.role === 'user' && m.content === 'Hello');
    assert.ok(userMsg, 'Should include user message');
  });

  test('sendMessage returns parsed response', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    const response = await adapter.sendMessage('Test');
    assert.equal(response.message.role, 'assistant');
    assert.equal(response.message.content, 'Mock response');
    assert.ok(response.message.id);
    assert.ok(response.message.timestamp > 0);
    assert.deepEqual(response.usage, {
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
    assert.equal(response.model, 'mock-model');
  });

  test('sendMessage stores messages in history', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    await adapter.sendMessage('Msg1');
    const history = adapter.getHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].role, 'user');
    assert.equal(history[1].role, 'assistant');
  });

  test('sendMessage uses custom formatRequest', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({
      apiClient: api,
      endpoint: '/chat',
      formatRequest: (messages, options) => ({
        custom_messages: messages,
        custom_model: options?.model || 'default',
      }),
    });
    await adapter.sendMessage('Hello');
    const body = api._lastPostBody();
    assert.ok(body.custom_messages, 'Should use custom format');
    assert.equal(body.custom_model, 'default');
  });

  test('sendMessage uses custom formatResponse', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({
      apiClient: api,
      endpoint: '/chat',
      formatResponse: (data) => ({
        content: 'Custom: ' + data.choices[0].message.content,
        usage: null,
        model: 'custom',
      }),
    });
    const response = await adapter.sendMessage('Test');
    assert.equal(response.message.content, 'Custom: Mock response');
    assert.equal(response.model, 'custom');
  });

  test('sendMessage passes model option in request', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat', model: 'gpt-4' });
    await adapter.sendMessage('Test');
    const body = api._lastPostBody();
    assert.equal(body.model, 'gpt-4');
  });

  test('sendMessage passes systemPrompt as system message', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    await adapter.sendMessage('Hello', { systemPrompt: 'You are helpful' });
    const body = api._lastPostBody();
    const systemMsg = body.messages.find((m) => m.role === 'system');
    assert.ok(systemMsg, 'Should include system message');
    assert.equal(systemMsg.content, 'You are helpful');
  });

  test('clearHistory empties conversation', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    await adapter.sendMessage('Test');
    adapter.clearHistory();
    assert.deepEqual(adapter.getHistory(), []);
  });

  test('message listeners notified', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    /** @type {any[]} */
    const received = [];
    adapter.onMessage((msg) => received.push(msg));

    await adapter.sendMessage('Test');
    assert.equal(received.length, 2);
    assert.equal(received[0].role, 'user');
    assert.equal(received[1].role, 'assistant');
  });

  test('handles API error gracefully', async () => {
    const api = createMockApiClient();
    api._setMockResponse({
      status: 500,
      data: { error: { message: 'Server error' } },
      headers: {},
      ok: false,
    });
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    await assert.rejects(
      () => adapter.sendMessage('Fail'),
      (err) => {
        assert.ok(err.message);
        return true;
      },
    );
  });

  test('separate factory calls are independent', async () => {
    const api = createMockApiClient();
    const a = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    const b = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    await a.sendMessage('Only A');
    assert.equal(a.getHistory().length, 2);
    assert.equal(b.getHistory().length, 0);
  });

  test('streamMessage falls back to non-streaming response', async () => {
    const api = createMockApiClient();
    const adapter = createHttpApiAdapter({ apiClient: api, endpoint: '/chat' });
    const chunks = [];
    for await (const chunk of adapter.streamMessage('Hello')) {
      chunks.push(chunk);
    }
    assert.ok(chunks.length >= 1, 'Should yield at least one chunk');
    const last = chunks[chunks.length - 1];
    assert.equal(last.done, true);
    assert.ok(last.message, 'Final chunk should have message');
    assert.equal(last.message.content, 'Mock response');
  });
});

// ---------------------------------------------------------------------------
// MessageHistory
// ---------------------------------------------------------------------------

describe('createMessageHistory', () => {
  test('starts empty', () => {
    const history = createMessageHistory();
    assert.deepEqual(history.getMessages(), []);
    assert.equal(history.getLastMessage(), null);
  });

  test('addMessage stores messages', () => {
    const history = createMessageHistory();
    const msg = { id: '1', role: 'user', content: 'Hi', timestamp: Date.now() };
    history.addMessage(msg);
    assert.equal(history.getMessages().length, 1);
    assert.equal(history.getMessages()[0].content, 'Hi');
  });

  test('getMessages returns immutable copy', () => {
    const history = createMessageHistory();
    history.addMessage({ id: '1', role: 'user', content: 'A', timestamp: Date.now() });
    const copy1 = history.getMessages();
    const copy2 = history.getMessages();
    assert.notStrictEqual(copy1, copy2);
    copy1.push({ id: '2', role: 'user', content: 'B', timestamp: Date.now() });
    assert.equal(history.getMessages().length, 1, 'Mutation should not affect internal state');
  });

  test('clear empties the history', () => {
    const history = createMessageHistory();
    history.addMessage({ id: '1', role: 'user', content: 'A', timestamp: Date.now() });
    history.clear();
    assert.deepEqual(history.getMessages(), []);
    assert.equal(history.getLastMessage(), null);
  });

  test('getLastMessage returns most recent', () => {
    const history = createMessageHistory();
    history.addMessage({ id: '1', role: 'user', content: 'First', timestamp: 1 });
    history.addMessage({ id: '2', role: 'assistant', content: 'Second', timestamp: 2 });
    const last = history.getLastMessage();
    assert.equal(last.content, 'Second');
  });

  test('trims when exceeding maxMessages', () => {
    const history = createMessageHistory({ maxMessages: 3 });
    for (let i = 0; i < 5; i++) {
      history.addMessage({ id: String(i), role: 'user', content: `Msg ${i}`, timestamp: i });
    }
    const messages = history.getMessages();
    assert.equal(messages.length, 3);
    assert.equal(messages[0].content, 'Msg 2', 'Should keep most recent');
    assert.equal(messages[2].content, 'Msg 4');
  });

  test('default maxMessages is 100', () => {
    const history = createMessageHistory();
    for (let i = 0; i < 105; i++) {
      history.addMessage({ id: String(i), role: 'user', content: `M${i}`, timestamp: i });
    }
    assert.equal(history.getMessages().length, 100);
  });

  test('toPromptContext returns role/content pairs', () => {
    const history = createMessageHistory();
    history.addMessage({ id: '1', role: 'user', content: 'Hello', timestamp: 1 });
    history.addMessage({ id: '2', role: 'assistant', content: 'Hi', timestamp: 2 });
    const context = history.toPromptContext();
    assert.deepEqual(context, [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]);
  });

  test('toPromptContext returns immutable copy', () => {
    const history = createMessageHistory();
    history.addMessage({ id: '1', role: 'user', content: 'A', timestamp: 1 });
    const c1 = history.toPromptContext();
    const c2 = history.toPromptContext();
    assert.notStrictEqual(c1, c2);
  });
});
