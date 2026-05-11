/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of messages-test in this repository.
 * @sidecar messages.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  t,
  setLocale,
  getLocale,
  registerLocale,
  resetLocale,
} from '../../apps/starter/messages.mjs';

afterEach(() => {
  resetLocale();
});

describe('t() — message lookup and interpolation', () => {
  test('returns a known message with no params', () => {
    assert.equal(t('status.ready'), 'Ready');
  });

  test('interpolates {name} placeholder', () => {
    assert.equal(t('greeting.hello', { name: 'Alice' }), 'Hello, Alice!');
  });

  test('returns the raw key when the key is missing', () => {
    assert.equal(t('unknown.key'), 'unknown.key');
  });

  test('interpolates numeric values', () => {
    registerLocale('en', { 'item.count': '{count} items' });
    assert.equal(t('item.count', { count: 42 }), '42 items');
  });
});

describe('setLocale() / getLocale()', () => {
  test('default locale is en', () => {
    assert.equal(getLocale(), 'en');
  });

  test('switches to a registered locale', () => {
    registerLocale('es', { 'greeting.hello': '\u00a1Hola, {name}!' });
    setLocale('es');
    assert.equal(getLocale(), 'es');
    assert.equal(t('greeting.hello', { name: 'Bob' }), '\u00a1Hola, Bob!');
  });

  test('throws for an unknown locale', () => {
    assert.throws(() => setLocale('xx'), /Unknown locale/);
  });
});

describe('registerLocale()', () => {
  test('adds a new locale', () => {
    registerLocale('fr', { 'greeting.hello': 'Bonjour, {name}\u202f!' });
    setLocale('fr');
    assert.equal(t('greeting.hello', { name: 'Claire' }), 'Bonjour, Claire\u202f!');
  });

  test('merges into an existing locale', () => {
    registerLocale('en', { 'new.key': 'New value' });
    assert.equal(t('new.key'), 'New value');
    // Original keys still work
    assert.equal(t('status.ready'), 'Ready');
  });
});

describe('resetLocale()', () => {
  test('reverts to en after switching', () => {
    registerLocale('de', { 'status.ready': 'Bereit' });
    setLocale('de');
    assert.equal(getLocale(), 'de');
    resetLocale();
    assert.equal(getLocale(), 'en');
  });
});
