/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of user-preferences-test in this repository.
 * @sidecar user-preferences.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPreferences,
  mergePreferences,
  isValidPreferences,
  assertStoragePort,
  createMemoryAdapter,
} from '../../modules/user-preferences/public-api.mjs';

describe('user-preferences domain — defaultPreferences()', () => {
  test('returns locale en and theme system', () => {
    const prefs = defaultPreferences();
    assert.equal(prefs.locale, 'en');
    assert.equal(prefs.theme, 'system');
  });

  test('returns a new object each time', () => {
    assert.notEqual(defaultPreferences(), defaultPreferences());
  });
});

describe('user-preferences domain — mergePreferences()', () => {
  test('updates locale', () => {
    const base = defaultPreferences();
    const next = mergePreferences(base, { locale: 'ru' });
    assert.equal(next.locale, 'ru');
    assert.equal(next.theme, 'system');
  });

  test('updates theme', () => {
    const base = defaultPreferences();
    const next = mergePreferences(base, { theme: 'dark' });
    assert.equal(next.theme, 'dark');
    assert.equal(next.locale, 'en');
  });

  test('ignores invalid theme values', () => {
    const base = defaultPreferences();
    const next = mergePreferences(base, { theme: 'neon' });
    assert.equal(next.theme, 'system');
  });

  test('ignores empty locale', () => {
    const base = defaultPreferences();
    const next = mergePreferences(base, { locale: '' });
    assert.equal(next.locale, 'en');
  });

  test('ignores null values', () => {
    const base = { locale: 'ru', theme: 'dark' };
    const next = mergePreferences(base, { locale: null, theme: null });
    assert.equal(next.locale, 'ru');
    assert.equal(next.theme, 'dark');
  });

  test('does not mutate the original', () => {
    const base = defaultPreferences();
    mergePreferences(base, { locale: 'fr' });
    assert.equal(base.locale, 'en');
  });
});

describe('user-preferences domain — isValidPreferences()', () => {
  test('accepts valid state', () => {
    assert.ok(isValidPreferences({ locale: 'en', theme: 'light' }));
    assert.ok(isValidPreferences({ locale: 'ru', theme: 'dark' }));
    assert.ok(isValidPreferences({ locale: 'fr', theme: 'system' }));
  });

  test('rejects null and primitives', () => {
    assert.ok(!isValidPreferences(null));
    assert.ok(!isValidPreferences(undefined));
    assert.ok(!isValidPreferences('string'));
    assert.ok(!isValidPreferences(42));
  });

  test('rejects missing fields', () => {
    assert.ok(!isValidPreferences({ locale: 'en' }));
    assert.ok(!isValidPreferences({ theme: 'dark' }));
    assert.ok(!isValidPreferences({}));
  });

  test('rejects invalid theme', () => {
    assert.ok(!isValidPreferences({ locale: 'en', theme: 'neon' }));
  });
});

describe('user-preferences port — assertStoragePort()', () => {
  test('accepts an adapter with load() and save()', () => {
    assert.doesNotThrow(() => assertStoragePort({ load: () => null, save: () => {} }));
  });

  test('throws for null', () => {
    assert.throws(() => assertStoragePort(null), TypeError);
  });

  test('throws for missing load', () => {
    assert.throws(() => assertStoragePort({ save: () => {} }), TypeError);
  });

  test('throws for missing save', () => {
    assert.throws(() => assertStoragePort({ load: () => null }), TypeError);
  });
});

describe('user-preferences adapter — memoryAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertStoragePort(createMemoryAdapter()));
  });

  test('returns null before any save', () => {
    const adapter = createMemoryAdapter();
    assert.equal(adapter.load(), null);
  });

  test('round-trips preferences', () => {
    const adapter = createMemoryAdapter();
    const prefs = { locale: 'ru', theme: 'dark' };
    adapter.save(prefs);
    assert.deepEqual(adapter.load(), prefs);
  });

  test('save creates a copy (no shared reference)', () => {
    const adapter = createMemoryAdapter();
    const prefs = { locale: 'en', theme: 'light' };
    adapter.save(prefs);
    prefs.locale = 'changed';
    assert.equal(adapter.load().locale, 'en');
  });
});
