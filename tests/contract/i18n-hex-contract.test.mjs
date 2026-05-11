/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify i18n module conforms to hex architecture contract (folder structure, barrel export, manifest, README, no deep imports).
 * @sidecar i18n-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/i18n/', import.meta.url);

test('i18n has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('i18n has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('i18n has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'i18n');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('i18n has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('i18n') || content.includes('I18n'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertI18nPort, 'function');
  assert.equal(typeof mod.createIntlAdapter, 'function');
  assert.equal(typeof mod.createMemoryI18nAdapter, 'function');
  assert.equal(typeof mod.interpolate, 'function');
  assert.equal(typeof mod.createPluralResolver, 'function');
  assert.equal(typeof mod.createMessageRegistry, 'function');
  assert.equal(typeof mod.buildFallbackChain, 'function');
  assert.equal(typeof mod.resolveWithFallback, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/interpolation.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/pluralization.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/message-registry.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/locale-resolver.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/i18n-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/intl-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-adapter.mjs', BASE)));
});

test('unit test file exists for the i18n module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/i18n.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(new URL('../../tests/unit/i18n.test.mjs', import.meta.url), 'utf8');
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/i18n/domain/"));
  assert.ok(!content.includes("from '../../modules/i18n/ports/"));
  assert.ok(!content.includes("from '../../modules/i18n/adapters/"));
});
