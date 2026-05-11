/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the theme bounded module — color scheme resolution, token validation, CSS rendering, preference record, port assertion, memory adapter.
 * @sidecar theme.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIGHT,
  DARK,
  AUTO,
  isValidColorScheme,
  isValidSystemColorScheme,
  resolveColorScheme,
  createThemeTokens,
  renderCssVariables,
  escapeCssValue,
  createThemePreference,
  assertThemePreferenceStorePort,
  createMemoryThemePreferenceStore,
} from '../../modules/theme/public-api.mjs';

// ---------------------------------------------------------------------------
// Color scheme
// ---------------------------------------------------------------------------

describe('theme domain — color scheme', () => {
  test('LIGHT, DARK, AUTO are the three canonical scheme constants', () => {
    assert.equal(LIGHT, 'light');
    assert.equal(DARK, 'dark');
    assert.equal(AUTO, 'auto');
  });

  test('isValidColorScheme accepts light, dark, auto and rejects others', () => {
    assert.equal(isValidColorScheme(LIGHT), true);
    assert.equal(isValidColorScheme(DARK), true);
    assert.equal(isValidColorScheme(AUTO), true);
    assert.equal(isValidColorScheme('sepia'), false);
    assert.equal(isValidColorScheme(null), false);
    assert.equal(isValidColorScheme(undefined), false);
    assert.equal(isValidColorScheme(1), false);
  });

  test('isValidSystemColorScheme accepts only light and dark', () => {
    assert.equal(isValidSystemColorScheme(LIGHT), true);
    assert.equal(isValidSystemColorScheme(DARK), true);
    assert.equal(isValidSystemColorScheme(AUTO), false);
    assert.equal(isValidSystemColorScheme('x'), false);
  });

  test('resolveColorScheme passes explicit light/dark through unchanged', () => {
    assert.equal(resolveColorScheme(LIGHT, DARK), LIGHT);
    assert.equal(resolveColorScheme(DARK, LIGHT), DARK);
  });

  test('resolveColorScheme collapses AUTO to the system preference', () => {
    assert.equal(resolveColorScheme(AUTO, LIGHT), LIGHT);
    assert.equal(resolveColorScheme(AUTO, DARK), DARK);
  });

  test('resolveColorScheme rejects invalid preference', () => {
    // @ts-expect-error invalid
    assert.throws(() => resolveColorScheme('sepia', LIGHT), TypeError);
  });

  test('resolveColorScheme rejects invalid system preference (including auto)', () => {
    // @ts-expect-error invalid
    assert.throws(() => resolveColorScheme(AUTO, AUTO), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => resolveColorScheme(LIGHT, 'sepia'), TypeError);
  });
});

// ---------------------------------------------------------------------------
// Theme tokens
// ---------------------------------------------------------------------------

describe('theme domain — createThemeTokens', () => {
  test('accepts matching light/dark maps and returns a frozen record', () => {
    const tokens = createThemeTokens({
      light: { 'color-bg': '#fff', 'color-fg': '#111' },
      dark: { 'color-bg': '#111', 'color-fg': '#fff' },
    });
    assert.equal(tokens.light['color-bg'], '#fff');
    assert.equal(tokens.dark['color-fg'], '#fff');
    assert.ok(Object.isFrozen(tokens));
    assert.ok(Object.isFrozen(tokens.light));
    assert.ok(Object.isFrozen(tokens.dark));
  });

  test('rejects null / non-object input', () => {
    assert.throws(() => createThemeTokens(null), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => createThemeTokens('x'), TypeError);
  });

  test('rejects missing light or dark map', () => {
    // @ts-expect-error invalid
    assert.throws(() => createThemeTokens({ light: { a: '1' } }), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => createThemeTokens({ dark: { a: '1' } }), TypeError);
  });

  test('rejects non-kebab-case keys', () => {
    assert.throws(
      () =>
        createThemeTokens({
          light: { colorBg: '#fff' },
          dark: { colorBg: '#111' },
        }),
      TypeError,
    );
    assert.throws(
      () =>
        createThemeTokens({
          light: { 'Color-Bg': '#fff' },
          dark: { 'Color-Bg': '#111' },
        }),
      TypeError,
    );
  });

  test('rejects empty or non-string values', () => {
    assert.throws(
      () =>
        createThemeTokens({
          light: { 'color-bg': '' },
          dark: { 'color-bg': '#111' },
        }),
      TypeError,
    );
    assert.throws(
      () =>
        createThemeTokens({
          // @ts-expect-error invalid
          light: { 'color-bg': 1 },
          dark: { 'color-bg': '#111' },
        }),
      TypeError,
    );
  });

  test('rejects mismatched key sets between light and dark', () => {
    assert.throws(
      () =>
        createThemeTokens({
          light: { 'color-bg': '#fff', 'color-fg': '#111' },
          dark: { 'color-bg': '#111' },
        }),
      TypeError,
    );
  });
});

describe('theme domain — renderCssVariables', () => {
  const tokens = createThemeTokens({
    light: { 'color-bg': '#ffffff', 'color-fg': '#111111' },
    dark: { 'color-bg': '#111111', 'color-fg': '#f5f5f5' },
  });

  test('renders the requested scheme as :root { --token: value } in sorted key order', () => {
    const css = renderCssVariables(tokens, 'light');
    assert.ok(css.startsWith(':root {\n'));
    assert.ok(css.trimEnd().endsWith('}'));
    assert.ok(css.includes('--color-bg: #ffffff;'));
    assert.ok(css.includes('--color-fg: #111111;'));
    const bgIndex = css.indexOf('--color-bg');
    const fgIndex = css.indexOf('--color-fg');
    assert.ok(bgIndex < fgIndex, 'keys must be sorted alphabetically');
  });

  test('renders the dark scheme when requested', () => {
    const css = renderCssVariables(tokens, 'dark');
    assert.ok(css.includes('--color-bg: #111111;'));
    assert.ok(css.includes('--color-fg: #f5f5f5;'));
  });

  test('rejects a non-resolved scheme (auto) at render time', () => {
    // @ts-expect-error auto is not a valid render target
    assert.throws(() => renderCssVariables(tokens, 'auto'), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => renderCssVariables(tokens, 'sepia'), TypeError);
  });

  test('escapeCssValue strips { } ; < \\ so a crafted palette cannot break out', () => {
    assert.equal(escapeCssValue('red;} body { color: green'), 'red body  color: green');
    assert.equal(escapeCssValue('url(foo<bar>)'), 'url(foobar>)');
    assert.equal(escapeCssValue('a\\b'), 'ab');
    assert.equal(escapeCssValue('#fff'), '#fff');
  });

  test('injection attempt in a token value is escaped in the rendered CSS', () => {
    const tainted = createThemeTokens({
      light: {
        'color-bg': '#fff;} body { background: red',
        'color-fg': '#000',
      },
      dark: {
        'color-bg': '#111',
        'color-fg': '#fff',
      },
    });
    const css = renderCssVariables(tainted, 'light');
    assert.ok(!css.includes('body {'), 'injected rule must be neutralized');
    assert.ok(!css.includes(';}'), 'declaration break must be stripped');
  });
});

// ---------------------------------------------------------------------------
// Theme preference
// ---------------------------------------------------------------------------

describe('theme domain — createThemePreference', () => {
  test('accepts a valid record and returns a frozen copy', () => {
    const pref = createThemePreference({ scheme: DARK, updatedAt: 1234 });
    assert.equal(pref.scheme, DARK);
    assert.equal(pref.updatedAt, 1234);
    assert.ok(Object.isFrozen(pref));
  });

  test('rejects null / non-object input', () => {
    assert.throws(() => createThemePreference(null), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => createThemePreference('x'), TypeError);
  });

  test('rejects invalid scheme', () => {
    // @ts-expect-error invalid
    assert.throws(() => createThemePreference({ scheme: 'sepia', updatedAt: 1 }), TypeError);
  });

  test('rejects invalid updatedAt', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createThemePreference({ scheme: LIGHT, updatedAt: '1' }),
      TypeError,
    );
    assert.throws(() => createThemePreference({ scheme: LIGHT, updatedAt: -1 }), TypeError);
    assert.throws(() => createThemePreference({ scheme: LIGHT, updatedAt: 1.5 }), TypeError);
    assert.throws(() => createThemePreference({ scheme: LIGHT, updatedAt: Number.NaN }), TypeError);
  });
});

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('theme ports — assertThemePreferenceStorePort', () => {
  test('accepts a complete adapter', () => {
    const fake = {
      get() {},
      set() {},
      clear() {},
    };
    assert.doesNotThrow(() => assertThemePreferenceStorePort(fake));
  });

  test('rejects null and non-object', () => {
    assert.throws(() => assertThemePreferenceStorePort(null), TypeError);
    assert.throws(() => assertThemePreferenceStorePort('no'), TypeError);
  });

  test('rejects adapter missing each method', () => {
    const base = { get() {}, set() {}, clear() {} };
    for (const method of ['get', 'set', 'clear']) {
      const broken = { ...base };
      delete (/** @type {any} */ (broken)[method]);
      assert.throws(() => assertThemePreferenceStorePort(broken), TypeError);
    }
  });
});

// ---------------------------------------------------------------------------
// Memory adapter
// ---------------------------------------------------------------------------

describe('theme adapters — createMemoryThemePreferenceStore', () => {
  test('satisfies the port contract', () => {
    const store = createMemoryThemePreferenceStore();
    assert.doesNotThrow(() => assertThemePreferenceStorePort(store));
  });

  test('get returns null for an unknown user', async () => {
    const store = createMemoryThemePreferenceStore();
    assert.equal(await store.get('alice'), null);
  });

  test('set then get round-trips the preference', async () => {
    const store = createMemoryThemePreferenceStore();
    const pref = createThemePreference({ scheme: DARK, updatedAt: 1000 });
    const written = await store.set('alice', pref);
    assert.equal(written.scheme, DARK);
    assert.equal(written.updatedAt, 1000);
    const read = await store.get('alice');
    assert.equal(read.scheme, DARK);
    assert.equal(read.updatedAt, 1000);
  });

  test('set overwrites an existing preference for the same user', async () => {
    const store = createMemoryThemePreferenceStore();
    await store.set('alice', createThemePreference({ scheme: LIGHT, updatedAt: 1 }));
    await store.set('alice', createThemePreference({ scheme: DARK, updatedAt: 2 }));
    const read = await store.get('alice');
    assert.equal(read.scheme, DARK);
    assert.equal(read.updatedAt, 2);
  });

  test('clear empties the store', async () => {
    const store = createMemoryThemePreferenceStore();
    await store.set('alice', createThemePreference({ scheme: DARK, updatedAt: 1 }));
    await store.set('bob', createThemePreference({ scheme: LIGHT, updatedAt: 2 }));
    assert.equal(store.size(), 2);
    store.clear();
    assert.equal(store.size(), 0);
    assert.equal(await store.get('alice'), null);
  });

  test('returned records cannot be mutated back into the store', async () => {
    const store = createMemoryThemePreferenceStore();
    await store.set('alice', createThemePreference({ scheme: DARK, updatedAt: 1 }));
    const read = await store.get('alice');
    read.scheme = LIGHT;
    const again = await store.get('alice');
    assert.equal(again.scheme, DARK);
  });

  test('rejects empty/non-string userId on get and set', async () => {
    const store = createMemoryThemePreferenceStore();
    await assert.rejects(() => store.get(''), TypeError);
    // @ts-expect-error invalid
    await assert.rejects(() => store.get(null), TypeError);
    await assert.rejects(
      () => store.set('', createThemePreference({ scheme: LIGHT, updatedAt: 1 })),
      TypeError,
    );
  });

  test('rejects non-object preference on set', async () => {
    const store = createMemoryThemePreferenceStore();
    // @ts-expect-error invalid
    await assert.rejects(() => store.set('alice', null), TypeError);
  });
});
