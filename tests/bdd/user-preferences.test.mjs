/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of user-preferences-test in this repository.
 * @sidecar user-preferences.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for user-preferences.feature.
 * Proves user-visible behavior through the user-preferences module public API.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  defaultPreferences,
  mergePreferences,
  isValidPreferences,
  assertStoragePort,
  createMemoryAdapter,
} from '../../modules/user-preferences/public-api.mjs';

const feature = readFileSync(
  new URL('./features/user-preferences.feature', import.meta.url),
  'utf8',
);

describe('Feature: User preferences management', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: User preferences management'));
    assert.ok(feature.includes('Scenario: Default preferences provide sensible values'));
    assert.ok(feature.includes('Scenario: Merge preferences updates selected fields'));
    assert.ok(feature.includes('Scenario: Invalid theme values are rejected'));
    assert.ok(feature.includes('Scenario: Preferences round-trip through storage'));
    assert.ok(feature.includes('Scenario: Validation rejects malformed preferences'));
  });

  test('Scenario: Default preferences provide sensible values', () => {
    const prefs = defaultPreferences();
    assert.equal(prefs.locale, 'en');
    assert.equal(prefs.theme, 'system');
  });

  test('Scenario: Merge preferences updates selected fields', () => {
    const base = defaultPreferences();
    const merged = mergePreferences(base, { theme: 'dark' });
    assert.equal(merged.theme, 'dark');
    assert.equal(merged.locale, 'en');
  });

  test('Scenario: Invalid theme values are rejected', () => {
    const base = defaultPreferences();
    const merged = mergePreferences(base, { theme: 'neon' });
    assert.equal(merged.theme, 'system');
  });

  test('Scenario: Preferences round-trip through storage', async () => {
    const adapter = createMemoryAdapter();
    assertStoragePort(adapter);
    const prefs = mergePreferences(defaultPreferences(), { theme: 'dark', locale: 'ru' });
    await adapter.save(prefs);
    const loaded = await adapter.load();
    assert.deepEqual(loaded, prefs);
  });

  test('Scenario: Validation rejects malformed preferences', () => {
    assert.equal(isValidPreferences(null), false);
    assert.equal(isValidPreferences({ locale: 'en' }), false);
    assert.equal(isValidPreferences({ locale: 'en', theme: 'dark' }), true);
  });
});
