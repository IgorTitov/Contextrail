/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove pure-logic contracts for AI chat UI components — selector registry completeness, i18n message layer, and locale management.
 * @sidecar ai-chat-ui.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the AI chat UI components.
 * Tests pure logic and selector registry — DOM testing belongs in E2E.
 *
 * SpecRefs: TPL-077; TPL-078
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { aiChat } from '../../apps/starter/ai-chat/ui-selectors.mjs';
import { t, setLocale, resetLocale, registerLocale } from '../../apps/starter/ai-chat/messages.mjs';

// ---------------------------------------------------------------------------
// UI selectors registry
// ---------------------------------------------------------------------------

describe('ai-chat ui-selectors', () => {
  test('exports all required selector keys', () => {
    assert.ok(aiChat.panel, 'panel selector should exist');
    assert.ok(aiChat.messageList, 'messageList selector should exist');
    assert.ok(aiChat.input, 'input selector should exist');
    assert.ok(aiChat.sendButton, 'sendButton selector should exist');
    assert.ok(aiChat.typingIndicator, 'typingIndicator selector should exist');
    assert.ok(aiChat.messagePrefix, 'messagePrefix selector should exist');
  });

  test('selector values are unique', () => {
    const values = [
      aiChat.panel,
      aiChat.messageList,
      aiChat.input,
      aiChat.sendButton,
      aiChat.typingIndicator,
    ];
    const unique = new Set(values);
    assert.equal(unique.size, values.length, 'All selectors should be unique');
  });
});

// ---------------------------------------------------------------------------
// UI messages (i18n)
// ---------------------------------------------------------------------------

describe('ai-chat UI messages', () => {
  test('t returns localized string for known key', () => {
    const result = t('ai-chat.ui.send');
    assert.equal(result, 'Send');
  });

  test('t returns key itself for unknown key', () => {
    const result = t('ai-chat.ui.nonexistent');
    assert.equal(result, 'ai-chat.ui.nonexistent');
  });

  test('t substitutes params', () => {
    registerLocale('en', { 'ai-chat.ui.test_param': 'Hello {name}!' });
    const result = t('ai-chat.ui.test_param', { name: 'World' });
    assert.equal(result, 'Hello World!');
  });

  test('setLocale throws for unknown locale', () => {
    assert.throws(() => setLocale('xx'), /Unknown locale/);
  });

  test('resetLocale returns to en', () => {
    resetLocale();
    const result = t('ai-chat.ui.send');
    assert.equal(result, 'Send');
  });
});
