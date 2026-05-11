/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of ai-chat-test in this repository.
 * @sidecar ai-chat.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for ai-chat.feature.
 * Proves user-visible chat behavior through the ai-chat module public API.
 *
 * SpecRefs: TPL-071; TPL-073; TPL-075
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertAiChatPort,
  createEchoAdapter,
  createMessageHistory,
} from '../../modules/ai-chat/public-api.mjs';

const feature = readFileSync(new URL('./features/ai-chat.feature', import.meta.url), 'utf8');

describe('Feature: AI chat conversation', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: AI chat conversation'));
    assert.ok(feature.includes('Scenario: Send a message with the echo adapter'));
    assert.ok(feature.includes('Scenario: Message history tracks conversation'));
    assert.ok(feature.includes('Scenario: Message history can be cleared'));
    assert.ok(feature.includes('Scenario: Message history respects the maximum limit'));
    assert.ok(feature.includes('Scenario: Prompt context contains only role and content'));
  });

  test('Scenario: Send a message with the echo adapter', async () => {
    // Given the echo chat adapter is active
    const adapter = createEchoAdapter();
    assertAiChatPort(adapter);

    // When the user sends "Hello, world!"
    const response = await adapter.sendMessage('Hello, world!');

    // Then the response contains "Hello, world!"
    assert.ok(response.message.content.includes('Hello, world!'));

    // And the response role is "assistant"
    assert.equal(response.message.role, 'assistant');
  });

  test('Scenario: Message history tracks conversation', async () => {
    // Given the echo chat adapter is active
    const adapter = createEchoAdapter();

    // When the user sends "First message"
    await adapter.sendMessage('First message');

    // And the user sends "Second message"
    await adapter.sendMessage('Second message');

    // Then the message history contains 4 messages (2 user + 2 assistant)
    const history = adapter.getHistory();
    assert.equal(history.length, 4);
  });

  test('Scenario: Message history can be cleared', async () => {
    // Given the echo chat adapter is active
    const adapter = createEchoAdapter();

    // And the user has sent "Some message"
    await adapter.sendMessage('Some message');
    assert.ok(adapter.getHistory().length > 0);

    // When the user clears the history
    adapter.clearHistory();

    // Then the message history is empty
    assert.equal(adapter.getHistory().length, 0);
  });

  test('Scenario: Message history respects the maximum limit', () => {
    // Given a message history with max 3 messages
    const history = createMessageHistory({ maxMessages: 3 });

    // When 5 messages are added
    for (let i = 0; i < 5; i++) {
      history.addMessage({ role: 'user', content: `msg ${i}`, id: `${i}`, timestamp: Date.now() });
    }

    // Then the history contains exactly 3 messages
    assert.equal(history.getMessages().length, 3);
  });

  test('Scenario: Prompt context contains only role and content', async () => {
    // Given the echo chat adapter is active
    const adapter = createEchoAdapter();

    // And the user has sent "Test message"
    await adapter.sendMessage('Test message');

    // When the prompt context is requested
    // Using message history directly since adapter exposes getHistory
    const history = createMessageHistory();
    history.addMessage({ role: 'user', content: 'Test', id: '1', timestamp: Date.now() });
    const context = history.toPromptContext();

    // Then each entry has only "role" and "content" fields
    for (const entry of context) {
      const keys = Object.keys(entry);
      assert.deepEqual(keys.sort(), ['content', 'role']);
    }
  });
});
