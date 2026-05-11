/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the repository identity and version helpers in scripts/lib/repo-meta.mjs.
 * @sidecar repo-meta.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  repoFileIdPrefix,
  allowedFileIdPrefixes,
  repoVersion,
  headerStampVersion,
  REPO_FILEID_PREFIX,
} from '../../scripts/lib/repo-meta.mjs';

// --- repoFileIdPrefix() ---

test('repoFileIdPrefix() returns a colon-terminated string', () => {
  const prefix = repoFileIdPrefix();
  assert.equal(typeof prefix, 'string');
  assert.ok(prefix.endsWith(':'), 'prefix must end with a colon');
  assert.ok(prefix.length > 1, 'prefix must not be just a colon');
});

test('repoFileIdPrefix() derives from package.json projectPrefix or name', () => {
  const __dir = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dir, '../../package.json'), 'utf8'));
  const expected = (pkg.projectPrefix || pkg.name) + ':';
  const prefix = repoFileIdPrefix();
  assert.equal(prefix, expected);
});

// --- allowedFileIdPrefixes() ---

test('allowedFileIdPrefixes() returns an array including repoFileIdPrefix', () => {
  const prefixes = allowedFileIdPrefixes();
  assert.ok(Array.isArray(prefixes));
  assert.ok(prefixes.length >= 1);
  assert.ok(prefixes.includes(repoFileIdPrefix()));
});

// --- REPO_FILEID_PREFIX ---

test('REPO_FILEID_PREFIX equals repoFileIdPrefix()', () => {
  assert.equal(REPO_FILEID_PREFIX, repoFileIdPrefix());
});

// --- repoVersion() ---

test('repoVersion() returns a semver-like version string', () => {
  const version = repoVersion();
  assert.equal(typeof version, 'string');
  assert.ok(/^\d+\.\d+\.\d+/.test(version), `version should look like semver, got: ${version}`);
});

test('repoVersion() matches the VERSION file content', () => {
  const versionFile = readFileSync(join(process.cwd(), 'VERSION'), 'utf8').trim();
  assert.equal(repoVersion(), versionFile);
});

// --- headerStampVersion() ---

test('headerStampVersion() returns the same value as repoVersion()', () => {
  assert.equal(headerStampVersion(), repoVersion());
});
