/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove pure-logic contracts for Local LLM UI components — selector registry completeness, i18n message layer, and locale management.
 * @sidecar local-llm-ui.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the Local LLM UI components.
 * Tests pure logic and selector registry — DOM testing belongs in E2E.
 *
 * SpecRefs: TPL-085
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { localLlm } from '../../apps/starter/local-llm/ui-selectors.mjs';
import {
  t,
  setLocale,
  resetLocale,
  registerLocale,
} from '../../apps/starter/local-llm/messages.mjs';

// ---------------------------------------------------------------------------
// UI selectors registry
// ---------------------------------------------------------------------------

describe('local-llm ui-selectors', () => {
  test('exports all required selector keys', () => {
    assert.ok(localLlm.panel, 'panel selector should exist');
    assert.ok(localLlm.modelSelector, 'modelSelector selector should exist');
    assert.ok(localLlm.loadButton, 'loadButton selector should exist');
    assert.ok(localLlm.progressBar, 'progressBar selector should exist');
    assert.ok(localLlm.progressFill, 'progressFill selector should exist');
    assert.ok(localLlm.statusIndicator, 'statusIndicator selector should exist');
    assert.ok(localLlm.storageUsage, 'storageUsage selector should exist');
    assert.ok(localLlm.clearCacheButton, 'clearCacheButton selector should exist');
    assert.ok(localLlm.capabilityWarning, 'capabilityWarning selector should exist');
  });

  test('selector values are unique', () => {
    const values = Object.values(localLlm);
    const unique = new Set(values);
    assert.equal(unique.size, values.length, 'All selectors should be unique');
  });
});

// ---------------------------------------------------------------------------
// UI messages (i18n)
// ---------------------------------------------------------------------------

describe('local-llm UI messages', () => {
  test('t returns localized string for known key', () => {
    const result = t('local-llm.ui.load_model');
    assert.equal(result, 'Load Model');
  });

  test('t returns key itself for unknown key', () => {
    const result = t('local-llm.ui.nonexistent');
    assert.equal(result, 'local-llm.ui.nonexistent');
  });

  test('t substitutes params', () => {
    const result = t('local-llm.ui.storage', { used: '10 MB', available: '100 MB' });
    assert.equal(result, 'Storage: 10 MB / 100 MB');
  });

  test('setLocale throws for unknown locale', () => {
    assert.throws(() => setLocale('xx'), /Unknown locale/);
  });

  test('resetLocale returns to en', () => {
    resetLocale();
    const result = t('local-llm.ui.load_model');
    assert.equal(result, 'Load Model');
  });

  test('registerLocale adds new messages', () => {
    registerLocale('en', { 'local-llm.ui.test_key': 'Test {val}' });
    const result = t('local-llm.ui.test_key', { val: 'OK' });
    assert.equal(result, 'Test OK');
  });
});
