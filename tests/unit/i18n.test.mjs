/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for i18n module — interpolation, pluralization, locale resolution, Intl formatting, adapters, and module-local messages.
 * @sidecar i18n.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertI18nPort,
  createIntlAdapter,
  createMemoryI18nAdapter,
  interpolate,
  createPluralResolver,
  PLURAL_CATEGORIES,
  createMessageRegistry,
  buildFallbackChain,
  resolveWithFallback,
} from '../../modules/i18n/public-api.mjs';

// ---------------------------------------------------------------------------
// assertI18nPort
// ---------------------------------------------------------------------------

describe('i18n port — assertI18nPort()', () => {
  const validAdapter = {
    t() {},
    tp() {},
    setLocale() {},
    getLocale() {},
    getAvailableLocales() {},
    registerMessages() {},
    formatNumber() {},
    formatDate() {},
    formatCurrency() {},
  };

  test('accepts a valid adapter with all nine methods', () => {
    assert.doesNotThrow(() => assertI18nPort(validAdapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertI18nPort(null), TypeError);
  });

  test('throws for undefined', () => {
    assert.throws(() => assertI18nPort(undefined), TypeError);
  });

  test('throws for a primitive', () => {
    assert.throws(() => assertI18nPort('string'), TypeError);
  });

  for (const method of [
    't',
    'tp',
    'setLocale',
    'getLocale',
    'getAvailableLocales',
    'registerMessages',
    'formatNumber',
    'formatDate',
    'formatCurrency',
  ]) {
    test(`throws for missing ${method}`, () => {
      const broken = { ...validAdapter };
      delete broken[method];
      assert.throws(() => assertI18nPort(broken), TypeError);
    });
  }

  test('error message uses i18n key for invalid adapter', () => {
    assert.throws(
      () => assertI18nPort(null),
      (err) => err.message.includes('I18nPort adapter must be a non-null object'),
    );
  });

  test('error message uses i18n key for missing method', () => {
    assert.throws(
      () => assertI18nPort({ ...validAdapter, t: undefined }),
      (err) => err.message.includes('I18nPort adapter must implement t()'),
    );
  });
});

// ---------------------------------------------------------------------------
// interpolation domain
// ---------------------------------------------------------------------------

describe('i18n domain — interpolation', () => {
  test('replaces a single placeholder', () => {
    assert.equal(interpolate('Hello, {name}!', { name: 'World' }), 'Hello, World!');
  });

  test('replaces multiple placeholders', () => {
    assert.equal(
      interpolate('{greeting}, {name}!', { greeting: 'Hi', name: 'Alice' }),
      'Hi, Alice!',
    );
  });

  test('handles numeric values', () => {
    assert.equal(interpolate('{count} items', { count: 42 }), '42 items');
  });

  test('returns template unchanged when no params match', () => {
    assert.equal(interpolate('Hello, {name}!', { other: 'x' }), 'Hello, {name}!');
  });

  test('handles empty params', () => {
    assert.equal(interpolate('Hello!', {}), 'Hello!');
  });

  test('handles undefined params', () => {
    assert.equal(interpolate('Hello!'), 'Hello!');
  });

  test('handles null template', () => {
    assert.equal(interpolate(null), '');
  });
});

// ---------------------------------------------------------------------------
// pluralization domain
// ---------------------------------------------------------------------------

describe('i18n domain — pluralization', () => {
  test('PLURAL_CATEGORIES is frozen array with standard categories', () => {
    assert.ok(Object.isFrozen(PLURAL_CATEGORIES));
    assert.ok(PLURAL_CATEGORIES.includes('one'));
    assert.ok(PLURAL_CATEGORIES.includes('other'));
  });

  test('English: "one" for 1, "other" for 0, 2, 5, 100', () => {
    const resolver = createPluralResolver('en');
    const forms = { one: '{count} item', other: '{count} items' };

    assert.equal(resolver.resolve(1, forms), '{count} item');
    assert.equal(resolver.resolve(0, forms), '{count} items');
    assert.equal(resolver.resolve(2, forms), '{count} items');
    assert.equal(resolver.resolve(5, forms), '{count} items');
    assert.equal(resolver.resolve(100, forms), '{count} items');
  });

  test('falls back to "other" when resolved category missing', () => {
    const resolver = createPluralResolver('en');
    const forms = { other: 'fallback' };
    assert.equal(resolver.resolve(1, forms), 'fallback');
  });

  test('returns empty string when no forms match', () => {
    const resolver = createPluralResolver('en');
    assert.equal(resolver.resolve(1, {}), '');
  });

  test('Russian pluralization distinguishes one/few/many', () => {
    const resolver = createPluralResolver('ru');
    const forms = {
      one: '{count} элемент',
      few: '{count} элемента',
      many: '{count} элементов',
      other: '{count} элементов',
    };

    assert.equal(resolver.resolve(1, forms), '{count} элемент');
    assert.equal(resolver.resolve(3, forms), '{count} элемента');
    assert.equal(resolver.resolve(5, forms), '{count} элементов');
    assert.equal(resolver.resolve(21, forms), '{count} элемент');
  });
});

// ---------------------------------------------------------------------------
// message-registry domain
// ---------------------------------------------------------------------------

describe('i18n domain — message-registry', () => {
  test('registers and resolves a bundle', () => {
    const reg = createMessageRegistry();
    reg.register('app', 'en', { 'app.hello': 'Hello' });
    assert.equal(reg.resolve('en', 'app.hello'), 'Hello');
  });

  test('merges into existing locale', () => {
    const reg = createMessageRegistry();
    reg.register('a', 'en', { 'a.x': 'X' });
    reg.register('b', 'en', { 'b.y': 'Y' });
    assert.equal(reg.resolve('en', 'a.x'), 'X');
    assert.equal(reg.resolve('en', 'b.y'), 'Y');
  });

  test('returns undefined for unknown key', () => {
    const reg = createMessageRegistry();
    assert.equal(reg.resolve('en', 'missing'), undefined);
  });

  test('getAvailableLocales returns sorted list', () => {
    const reg = createMessageRegistry();
    reg.register('a', 'ru', { x: 'X' });
    reg.register('a', 'en', { x: 'X' });
    reg.register('a', 'de', { x: 'X' });
    assert.deepEqual(reg.getAvailableLocales(), ['de', 'en', 'ru']);
  });

  test('getKeysForLocale returns all keys', () => {
    const reg = createMessageRegistry();
    reg.register('a', 'en', { 'a.x': 'X', 'a.y': 'Y' });
    const keys = reg.getKeysForLocale('en');
    assert.ok(keys.includes('a.x'));
    assert.ok(keys.includes('a.y'));
  });

  test('getKeysForLocale returns empty for unknown locale', () => {
    const reg = createMessageRegistry();
    assert.deepEqual(reg.getKeysForLocale('zz'), []);
  });

  test('clear empties registry', () => {
    const reg = createMessageRegistry();
    reg.register('a', 'en', { x: 'X' });
    reg.clear();
    assert.equal(reg.resolve('en', 'x'), undefined);
    assert.deepEqual(reg.getAvailableLocales(), []);
  });

  test('throws for invalid namespace', () => {
    const reg = createMessageRegistry();
    assert.throws(() => reg.register('', 'en', { x: 'X' }), TypeError);
  });

  test('throws for invalid locale', () => {
    const reg = createMessageRegistry();
    assert.throws(() => reg.register('a', '', { x: 'X' }), TypeError);
  });

  test('throws for invalid messages', () => {
    const reg = createMessageRegistry();
    assert.throws(() => reg.register('a', 'en', null), TypeError);
  });
});

// ---------------------------------------------------------------------------
// locale-resolver domain
// ---------------------------------------------------------------------------

describe('i18n domain — locale-resolver', () => {
  test('builds chain from full BCP 47 tag', () => {
    assert.deepEqual(buildFallbackChain('zh-Hant-TW', 'en'), ['zh-Hant-TW', 'zh-Hant', 'zh', 'en']);
  });

  test('does not duplicate default locale', () => {
    assert.deepEqual(buildFallbackChain('en', 'en'), ['en']);
  });

  test('simple locale with different default', () => {
    assert.deepEqual(buildFallbackChain('ru', 'en'), ['ru', 'en']);
  });

  test('two-part locale', () => {
    assert.deepEqual(buildFallbackChain('ru-RU', 'en'), ['ru-RU', 'ru', 'en']);
  });

  test('resolveWithFallback tries chain in order', () => {
    const reg = createMessageRegistry();
    reg.register('a', 'en', { key: 'English' });
    reg.register('a', 'ru', { key: 'Русский' });

    assert.equal(resolveWithFallback(['ru', 'en'], reg, 'key'), 'Русский');
    assert.equal(resolveWithFallback(['de', 'en'], reg, 'key'), 'English');
  });

  test('resolveWithFallback returns undefined if not found', () => {
    const reg = createMessageRegistry();
    assert.equal(resolveWithFallback(['en'], reg, 'missing'), undefined);
  });
});

// ---------------------------------------------------------------------------
// intl-adapter
// ---------------------------------------------------------------------------

describe('i18n adapter — intlAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertI18nPort(createIntlAdapter()));
  });

  test('t returns key for missing message', () => {
    const i18n = createIntlAdapter();
    assert.equal(i18n.t('missing.key'), 'missing.key');
  });

  test('t interpolates params', () => {
    const i18n = createIntlAdapter();
    i18n.registerMessages('app', 'en', { hi: 'Hello, {name}!' });
    assert.equal(i18n.t('hi', { name: 'World' }), 'Hello, World!');
  });

  test('setLocale and getLocale work', () => {
    const i18n = createIntlAdapter({ defaultLocale: 'en' });
    assert.equal(i18n.getLocale(), 'en');
    i18n.setLocale('ru');
    assert.equal(i18n.getLocale(), 'ru');
  });

  test('registerMessages makes keys available', () => {
    const i18n = createIntlAdapter();
    i18n.registerMessages('x', 'en', { 'x.hello': 'Hello' });
    assert.equal(i18n.t('x.hello'), 'Hello');
  });

  test('getAvailableLocales returns registered locales', () => {
    const i18n = createIntlAdapter();
    i18n.registerMessages('a', 'en', { x: 'X' });
    i18n.registerMessages('a', 'ru', { x: 'X' });
    assert.deepEqual(i18n.getAvailableLocales(), ['en', 'ru']);
  });

  test('fallback chain: requested locale missing, falls back to default', () => {
    const i18n = createIntlAdapter({ defaultLocale: 'en' });
    i18n.registerMessages('a', 'en', { key: 'English' });
    i18n.setLocale('de');
    assert.equal(i18n.t('key'), 'English');
  });

  test('fallback chain: partial match on subtag', () => {
    const i18n = createIntlAdapter({ defaultLocale: 'en' });
    i18n.registerMessages('a', 'ru', { key: 'Русский' });
    i18n.registerMessages('a', 'en', { key: 'English' });
    i18n.setLocale('ru-RU');
    assert.equal(i18n.t('key'), 'Русский');
  });

  test('tp selects correct plural form', () => {
    const i18n = createIntlAdapter({ defaultLocale: 'en' });
    const forms = { one: '{count} item', other: '{count} items' };
    assert.equal(i18n.tp('items', 1, forms), '1 item');
    assert.equal(i18n.tp('items', 5, forms), '5 items');
  });

  test('tp returns key when no form matches', () => {
    const i18n = createIntlAdapter();
    assert.equal(i18n.tp('fallback', 3, {}), 'fallback');
  });

  test('formatNumber returns formatted string', () => {
    const i18n = createIntlAdapter({ defaultLocale: 'en' });
    const result = i18n.formatNumber(1234.5);
    assert.equal(typeof result, 'string');
    assert.ok(result.includes('1'));
  });

  test('formatDate returns formatted string', () => {
    const i18n = createIntlAdapter({ defaultLocale: 'en' });
    const result = i18n.formatDate(new Date('2026-01-15'));
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('formatCurrency returns formatted string', () => {
    const i18n = createIntlAdapter({ defaultLocale: 'en' });
    const result = i18n.formatCurrency(9.99, 'USD');
    assert.equal(typeof result, 'string');
    assert.ok(result.includes('9.99') || result.includes('9,99'));
  });

  test('initialMessages option pre-loads bundles', () => {
    const i18n = createIntlAdapter({
      defaultLocale: 'en',
      initialMessages: {
        app: {
          en: { 'app.hello': 'Hello' },
          ru: { 'app.hello': 'Привет' },
        },
      },
    });
    assert.equal(i18n.t('app.hello'), 'Hello');
    i18n.setLocale('ru');
    assert.equal(i18n.t('app.hello'), 'Привет');
  });
});

// ---------------------------------------------------------------------------
// memory-adapter
// ---------------------------------------------------------------------------

describe('i18n adapter — memoryAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertI18nPort(createMemoryI18nAdapter()));
  });

  test('t works identically to intl-adapter for messages', () => {
    const i18n = createMemoryI18nAdapter();
    i18n.registerMessages('a', 'en', { 'a.hi': 'Hello, {name}!' });
    assert.equal(i18n.t('a.hi', { name: 'Test' }), 'Hello, Test!');
  });

  test('t returns key for missing message', () => {
    const i18n = createMemoryI18nAdapter();
    assert.equal(i18n.t('missing'), 'missing');
  });

  test('tp uses simple one/other rule', () => {
    const i18n = createMemoryI18nAdapter();
    const forms = { one: '{count} thing', other: '{count} things' };
    assert.equal(i18n.tp('x', 1, forms), '1 thing');
    assert.equal(i18n.tp('x', 5, forms), '5 things');
  });

  test('formatNumber returns string', () => {
    const i18n = createMemoryI18nAdapter();
    assert.equal(i18n.formatNumber(42), '42');
  });

  test('formatDate returns ISO string', () => {
    const i18n = createMemoryI18nAdapter();
    const d = new Date('2026-01-15T00:00:00.000Z');
    assert.ok(i18n.formatDate(d).includes('2026'));
  });

  test('formatCurrency returns currency + amount', () => {
    const i18n = createMemoryI18nAdapter();
    assert.equal(i18n.formatCurrency(9.99, 'USD'), 'USD 9.99');
  });

  test('setLocale and getLocale work', () => {
    const i18n = createMemoryI18nAdapter();
    i18n.setLocale('de');
    assert.equal(i18n.getLocale(), 'de');
  });

  test('initialMessages option works', () => {
    const i18n = createMemoryI18nAdapter({
      initialMessages: { x: { en: { 'x.y': 'Z' } } },
    });
    assert.equal(i18n.t('x.y'), 'Z');
  });
});
