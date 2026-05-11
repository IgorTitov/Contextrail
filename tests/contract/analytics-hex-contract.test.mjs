/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of analytics-hex-contract-test in this repository.
 * @sidecar analytics-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/analytics/', import.meta.url);

test('analytics has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('analytics has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('analytics has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'analytics');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('analytics has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(content.includes('analytics'), 'README should describe the module');
  assert.ok(
    content.includes('privacy') || content.includes('Privacy'),
    'README should mention privacy',
  );
});

test('analytics has a messages.mjs for i18n', () => {
  assert.ok(existsSync(new URL('messages.mjs', BASE)));
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertAnalyticsPort, 'function');
  assert.equal(typeof mod.createSessionManager, 'function');
  assert.equal(typeof mod.isConsentGranted, 'function');
  assert.equal(typeof mod.respectsDoNotTrack, 'function');
  assert.equal(typeof mod.createDefaultConsent, 'function');
  assert.equal(typeof mod.createAnalyticsConsoleAdapter, 'function');
  assert.equal(typeof mod.createAnalyticsNoOpAdapter, 'function');
  assert.equal(typeof mod.createBehavioralAdapter, 'function');
  assert.equal(typeof mod.createMouseCollector, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/consent.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/session-manager.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/mouse-collector.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/analytics-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/console-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/no-op-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/behavioral-adapter.mjs', BASE)));
});

test('unit test file exists for the analytics module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/analytics.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/analytics.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/analytics/domain/"));
  assert.ok(!content.includes("from '../../modules/analytics/ports/"));
  assert.ok(!content.includes("from '../../modules/analytics/adapters/"));
});
