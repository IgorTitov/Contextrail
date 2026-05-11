/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of log-hex-contract-test in this repository.
 * @sidecar log-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/log/', import.meta.url);

test('log has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('log has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('log has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'log');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('log has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('log') || content.includes('Log'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertLogPort, 'function');
  assert.equal(typeof mod.createConsoleAdapter, 'function');
  assert.equal(typeof mod.createStructuredJsonAdapter, 'function');
  assert.equal(typeof mod.createNoOpAdapter, 'function');
  assert.equal(typeof mod.createRemoteAdapter, 'function');
  assert.equal(typeof mod.createFileLogAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/log-levels.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/log-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/console-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/structured-json-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/no-op-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/remote-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/file-adapter.mjs', BASE)));
});

test('unit test file exists for the log module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/log.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(new URL('../../tests/unit/log.test.mjs', import.meta.url), 'utf8');
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/log/domain/"));
  assert.ok(!content.includes("from '../../modules/log/ports/"));
  assert.ok(!content.includes("from '../../modules/log/adapters/"));
});
