/* @HEADER
 * @version 0.7.62 | 2026-05-03
 * @purpose Integration tests for post-commit snapshot warning: asserts warning fires when VERSION bumped without snapshot, silent when snapshot present.
 * @sidecar post-commit-snapshot-warn.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Integration tests for post-commit-snapshot-warn.mjs (TPL-260).
 *
 * Validates that `runPostCommitWarn(repoRoot)` / `collectWarnState(repoRoot)`
 * behave correctly against a real git fixture with committed VERSION files.
 *
 * Test shape:
 *   1. Minimal git repo with two commits — first at v0.0.1, second at v0.0.2.
 *   2. No .backups/ directory → warning expected for v0.0.2.
 *   3. Add .backups/ with correct filenames → no warning.
 *   4. Add .backups/ with only .txt (missing .zip) → warning for zip.
 *
 * Every git call uses safeGitSpawn (R1 — no live git outside os.tmpdir()).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  collectWarnState,
  runPostCommitWarn,
  snapshotWarnCheck,
} from '../../scripts/checks/post-commit-snapshot-warn.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createFixture(label) {
  const root = mkdtempSync(join(tmpdir(), `post-commit-snap-${label}-`));

  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@snap-warn.local']);
  safeGitSpawn(root, ['config', 'user.name', 'Snap Warn Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

  // First commit at v0.0.1
  writeFileSync(join(root, 'VERSION'), '0.0.1\n');
  writeFileSync(join(root, 'package.json'),
    JSON.stringify({ name: 'snap-fixture', version: '0.0.1' }, null, 2) + '\n');
  safeGitSpawn(root, ['add', 'VERSION', 'package.json']);
  safeGitSpawn(root, ['commit', '-m', 'init: v0.0.1']);

  // Second commit at v0.0.2 (the "bumped" commit)
  writeFileSync(join(root, 'VERSION'), '0.0.2\n');
  writeFileSync(join(root, 'package.json'),
    JSON.stringify({ name: 'snap-fixture', version: '0.0.2' }, null, 2) + '\n');
  safeGitSpawn(root, ['add', 'VERSION', 'package.json']);
  safeGitSpawn(root, ['commit', '-m', 'bump: v0.0.2']);

  return root;
}

const fixtures = [];
afterEach(() => {
  while (fixtures.length) {
    const d = fixtures.pop();
    try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('collectWarnState', () => {
  test('reads newVersion=0.0.2 and prevVersion=0.0.1 from fixture commits', () => {
    const root = createFixture('collect');
    fixtures.push(root);

    const state = collectWarnState(root);
    assert.equal(state.newVersion, '0.0.2');
    assert.equal(state.prevVersion, '0.0.1');
    assert.equal(state.pkgName, 'snap-fixture');
    assert.ok(Array.isArray(state.backupFiles));
  });

  test('backupFiles is empty when .backups/ does not exist', () => {
    const root = createFixture('no-backups');
    fixtures.push(root);
    assert.ok(!existsSync(join(root, '.backups')));

    const state = collectWarnState(root);
    assert.deepEqual(state.backupFiles, []);
  });

  test('backupFiles lists .backups/ contents when directory exists', () => {
    const root = createFixture('with-backups');
    fixtures.push(root);

    mkdirSync(join(root, '.backups'));
    writeFileSync(join(root, '.backups', 'merge-snap-fixture(0.0.2).txt'), 'snap');
    writeFileSync(join(root, '.backups', 'merge-snap-fixture(0.0.2).zip'), 'zip');

    const state = collectWarnState(root);
    assert.ok(state.backupFiles.includes('merge-snap-fixture(0.0.2).txt'));
    assert.ok(state.backupFiles.includes('merge-snap-fixture(0.0.2).zip'));
  });
});

describe('runPostCommitWarn', () => {
  test('returns true and prints warning when snapshot missing after VERSION bump', () => {
    const root = createFixture('warn-missing');
    fixtures.push(root);

    const lines = [];
    const origLog = console.log;
    console.log = (...args) => lines.push(args.join(' '));
    let warned;
    try {
      warned = runPostCommitWarn(root);
    } finally {
      console.log = origLog;
    }

    assert.equal(warned, true);
    const output = lines.join('\n');
    assert.ok(output.includes('0.0.2'), `expected version in warning, got: ${output}`);
    assert.ok(output.includes('mergezip:no-bump'), `expected remedy hint in warning, got: ${output}`);
  });

  test('returns false and prints nothing when both snapshots are present', () => {
    const root = createFixture('no-warn-present');
    fixtures.push(root);

    mkdirSync(join(root, '.backups'));
    writeFileSync(join(root, '.backups', 'merge-snap-fixture(0.0.2).txt'), 'snap');
    writeFileSync(join(root, '.backups', 'merge-snap-fixture(0.0.2).zip'), 'zip');

    const lines = [];
    const origLog = console.log;
    console.log = (...args) => lines.push(args.join(' '));
    let warned;
    try {
      warned = runPostCommitWarn(root);
    } finally {
      console.log = origLog;
    }

    assert.equal(warned, false);
    assert.equal(lines.length, 0);
  });

  test('returns true when only .txt is present but .zip is missing', () => {
    const root = createFixture('warn-missing-zip');
    fixtures.push(root);

    mkdirSync(join(root, '.backups'));
    writeFileSync(join(root, '.backups', 'merge-snap-fixture(0.0.2).txt'), 'snap');

    const lines = [];
    const origLog = console.log;
    console.log = (...args) => lines.push(args.join(' '));
    let warned;
    try {
      warned = runPostCommitWarn(root);
    } finally {
      console.log = origLog;
    }

    assert.equal(warned, true);
    const output = lines.join('\n');
    assert.ok(output.includes('.zip'), `expected .zip in warning, got: ${output}`);
  });

  test('returns false when no VERSION bump between HEAD and HEAD~1', () => {
    const root = createFixture('no-bump');
    fixtures.push(root);

    // createFixture ends at HEAD=v0.0.2, HEAD~1=v0.0.1.
    // Add a commit that does NOT change VERSION so HEAD=v0.0.2 and HEAD~1=v0.0.2.
    writeFileSync(join(root, 'readme.txt'), 'no version bump\n');
    safeGitSpawn(root, ['add', 'readme.txt']);
    safeGitSpawn(root, ['commit', '-m', 'docs: no version bump']);

    // HEAD = v0.0.2, HEAD~1 = v0.0.2 → same version → no warn expected
    const lines = [];
    const origLog = console.log;
    console.log = (...args) => lines.push(args.join(' '));
    let warned;
    try {
      warned = runPostCommitWarn(root);
    } finally {
      console.log = origLog;
    }

    assert.equal(warned, false);
    assert.equal(lines.length, 0);
  });
});
