/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of file-hex-contract-test in this repository.
 * @sidecar file-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Hex structure contract tests for the file module.
 * Verifies folder layout, public-api exports, manifest, and README.
 *
 * SpecRefs: TPL-160, TPL-161, TPL-162
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/file/', import.meta.url);

test('file has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('file has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('file has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('exagonal') || content.includes('file'),
    'README should describe the module',
  );
});

test('file has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'file');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('file has a messages.mjs i18n layer', () => {
  assert.ok(existsSync(new URL('messages.mjs', BASE)));
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));

  // Port
  assert.equal(typeof mod.assertFilePort, 'function');

  // Domain — MIME detection
  assert.equal(typeof mod.detectMimeType, 'function');
  assert.equal(typeof mod.getExtension, 'function');
  assert.equal(typeof mod.MIME_TYPES, 'object');

  // Domain — validation
  assert.equal(typeof mod.validateFile, 'function');

  // Domain — utilities
  assert.equal(typeof mod.formatFileSize, 'function');
  assert.equal(typeof mod.generateFileId, 'function');

  // Adapters
  assert.equal(typeof mod.createBlobAdapter, 'function');
  assert.equal(typeof mod.createFileSystemAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/mime-detection.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/file-validation.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/file-utils.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/file-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/blob-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/file-system-adapter.mjs', BASE)));
});

test('unit test file exists for the file module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/file.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(new URL('../../tests/unit/file.test.mjs', import.meta.url), 'utf8');
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/file/domain/"));
  assert.ok(!content.includes("from '../../modules/file/ports/"));
  assert.ok(!content.includes("from '../../modules/file/adapters/"));
});

test('file has a types.d.ts declaration file', () => {
  assert.ok(existsSync(new URL('types.d.ts', BASE)));
});
