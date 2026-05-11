/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify service worker constants (CACHE_NAME, APP_SHELL_URLS) and the isAppShellUrl classification function.
 * @sidecar sw.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CACHE_NAME, APP_SHELL_URLS, isAppShellUrl } from '../../apps/starter/sw.mjs';

describe('Service Worker config (TPL-027)', () => {
  it('CACHE_NAME is a non-empty versioned string', () => {
    assert.equal(typeof CACHE_NAME, 'string');
    assert.ok(CACHE_NAME.length > 0);
    assert.match(CACHE_NAME, /v\d+/, 'should contain a version segment');
  });

  it('APP_SHELL_URLS is a non-empty array of strings', () => {
    assert.ok(Array.isArray(APP_SHELL_URLS));
    assert.ok(APP_SHELL_URLS.length > 0);
    APP_SHELL_URLS.forEach((url) => assert.equal(typeof url, 'string'));
  });

  it('APP_SHELL_URLS includes root entry (./) ', () => {
    assert.ok(APP_SHELL_URLS.includes('./'));
  });

  it('APP_SHELL_URLS includes app.mjs', () => {
    assert.ok(APP_SHELL_URLS.includes('./app.mjs'));
  });

  it('APP_SHELL_URLS includes manifest.json', () => {
    assert.ok(APP_SHELL_URLS.includes('./manifest.json'));
  });

  it('APP_SHELL_URLS includes CSS files', () => {
    const css = APP_SHELL_URLS.filter((u) => u.endsWith('.css'));
    assert.ok(css.length >= 1, 'should include at least one CSS file');
  });

  it('APP_SHELL_URLS includes index.html', () => {
    assert.ok(APP_SHELL_URLS.includes('./index.html'));
  });
});

describe('isAppShellUrl (TPL-027)', () => {
  const base = 'http://localhost/apps/starter/sw.mjs';

  it('matches root entry', () => {
    assert.equal(isAppShellUrl(new URL('http://localhost/apps/starter/'), base), true);
  });

  it('matches index.html', () => {
    assert.equal(isAppShellUrl(new URL('http://localhost/apps/starter/index.html'), base), true);
  });

  it('matches app.mjs', () => {
    assert.equal(isAppShellUrl(new URL('http://localhost/apps/starter/app.mjs'), base), true);
  });

  it('matches nested CSS file', () => {
    assert.equal(
      isAppShellUrl(new URL('http://localhost/apps/starter/layout/layout.css'), base),
      true,
    );
  });

  it('rejects unknown same-origin path', () => {
    assert.equal(isAppShellUrl(new URL('http://localhost/api/data'), base), false);
  });

  it('rejects cross-origin URL', () => {
    assert.equal(isAppShellUrl(new URL('http://evil.com/apps/starter/app.mjs'), base), false);
  });

  it('rejects same-origin path not in shell list', () => {
    assert.equal(isAppShellUrl(new URL('http://localhost/apps/starter/unknown.mjs'), base), false);
  });
});
