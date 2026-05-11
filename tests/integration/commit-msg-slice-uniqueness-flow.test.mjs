/* @HEADER
 * @version 0.8.12 | 2026-05-11
 * @purpose Integration test for the slice-ID uniqueness enforcement flow — end-to-end with real git repos: unique accepted, duplicate rejected, valid override consumed and archived, invalid override rejected.
 * @sidecar commit-msg-slice-uniqueness-flow.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Integration test (TPL-333 / ADR-0049).
 *
 * Each scenario builds a real isolated git repo under tmpdir and calls
 * checkSliceIdUniqueness() directly — this exercises the full runtime path
 * including git-log scanning and the override file lifecycle, without
 * needing to copy the entire scripts/ dependency tree.
 *
 * Git calls use safeGitSpawn (R1, ADR-0015).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, existsSync,
  readdirSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { checkSliceIdUniqueness } from '../../scripts/checks/commit-msg-check.mjs';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempRepo(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `cmuf-${suffix}-`));
  mkdirSync(join(dir, '.coa', 'slice-id-override-log'), { recursive: true });
  safeGitSpawn(dir, ['init', '-b', 'main'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.email', 'test@example.com'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.name', 'Test'], { stdio: 'pipe' });
  writeFileSync(join(dir, 'init.txt'), 'init\n');
  safeGitSpawn(dir, ['add', 'init.txt'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', 'chore: init'], { stdio: 'pipe' });
  return dir;
}

function commitWithSubject(dir, subject) {
  const fname = `f-${Date.now()}.txt`;
  writeFileSync(join(dir, fname), 'x\n');
  safeGitSpawn(dir, ['add', fname], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', subject], { stdio: 'pipe' });
}

function writeOverride(dir, obj) {
  writeFileSync(join(dir, '.coa', 'slice-id-override.json'), JSON.stringify(obj, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('commit-msg-slice-uniqueness-flow — unique ID', () => {
  test('accepts a commit whose slice ID is not yet in history', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cmuf-unique-'));
    try {
      mkdirSync(join(dir, '.coa', 'slice-id-override-log'), { recursive: true });
      safeGitSpawn(dir, ['init', '-b', 'main'], { stdio: 'pipe' });
      safeGitSpawn(dir, ['config', 'user.email', 'test@example.com'], { stdio: 'pipe' });
      safeGitSpawn(dir, ['config', 'user.name', 'Test'], { stdio: 'pipe' });
      writeFileSync(join(dir, 'init.txt'), 'init\n');
      safeGitSpawn(dir, ['add', 'init.txt'], { stdio: 'pipe' });
      safeGitSpawn(dir, ['commit', '--no-verify', '-m', 'chore: init'], { stdio: 'pipe' });

      const result = await checkSliceIdUniqueness('TPL-1001', {
        repoRoot: dir,
        coaDir: join(dir, '.coa'),
      });
      assert.equal(result.ok, true);
      assert.equal(result.reason, 'no-duplicate');
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });
});

describe('commit-msg-slice-uniqueness-flow — duplicate detected', () => {
  test('rejects a commit whose slice ID is already in a history subject line', async () => {
    const dir = makeTempRepo('dup');
    try {
      // Land TPL-2001 in history first
      commitWithSubject(dir, 'feat(auth): first delivery (TPL-2001)');

      const result = await checkSliceIdUniqueness('TPL-2001', {
        repoRoot: dir,
        coaDir: join(dir, '.coa'),
      });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'duplicate-slice-id');
      assert.ok(result.duplicate, 'should have duplicate info');
      assert.ok(result.duplicate.subject.includes('TPL-2001'));
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });

  test('does not trigger on a different slice ID from a different project', async () => {
    const dir = makeTempRepo('no-cross');
    try {
      commitWithSubject(dir, 'feat(auth): delivery (AIC-2001)');

      const result = await checkSliceIdUniqueness('TPL-2001', {
        repoRoot: dir,
        coaDir: join(dir, '.coa'),
      });
      assert.equal(result.ok, true);
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });
});

describe('commit-msg-slice-uniqueness-flow — valid override consumed', () => {
  test('accepts commit with valid override, archives log, deletes input file', async () => {
    const dir = makeTempRepo('ovr-ok');
    try {
      commitWithSubject(dir, 'feat(state): first delivery (TPL-3001)');

      writeOverride(dir, {
        slice_id: 'TPL-3001',
        timestamp: new Date().toISOString(),
        reason: 'History restoration — ceremony failed after commit landed',
        category: 'history-restoration',
      });

      const result = await checkSliceIdUniqueness('TPL-3001', {
        repoRoot: dir,
        coaDir: join(dir, '.coa'),
      });

      assert.equal(result.ok, true, `Expected ok=true but got reason: ${result.overrideReason || result.reason}`);
      assert.equal(result.reason, 'override-accepted');
      assert.ok(result.duplicate, 'should report the duplicate that was overridden');

      // Override file must be deleted
      assert.ok(!existsSync(join(dir, '.coa', 'slice-id-override.json')),
        'input override file should be deleted after consumption');

      // Log entry must exist
      const logFiles = readdirSync(join(dir, '.coa', 'slice-id-override-log'));
      assert.ok(logFiles.length > 0, 'log entry should be created in archive dir');
      assert.ok(logFiles.some(f => f.includes('TPL-3001')), 'log file name should include slice ID');
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });
});

describe('commit-msg-slice-uniqueness-flow — expired override', () => {
  test('rejects a duplicate with an expired override (TTL > 60s)', async () => {
    const dir = makeTempRepo('ovr-ttl');
    try {
      commitWithSubject(dir, 'fix(cache): LRU eviction (TPL-4001)');

      writeOverride(dir, {
        slice_id: 'TPL-4001',
        timestamp: new Date(Date.now() - 90_000).toISOString(), // 90 seconds ago
        reason: 'History restoration — ceremony failed after commit landed',
        category: 'history-restoration',
      });

      const result = await checkSliceIdUniqueness('TPL-4001', {
        repoRoot: dir,
        coaDir: join(dir, '.coa'),
      });

      assert.equal(result.ok, false);
      assert.equal(result.reason, 'duplicate-slice-id');
      assert.match(result.overrideReason, /TTL expired|older than 60/);
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });
});

describe('commit-msg-slice-uniqueness-flow — future timestamp rejected', () => {
  test('rejects override with timestamp more than 5s in the future', async () => {
    const dir = makeTempRepo('ovr-future');
    try {
      commitWithSubject(dir, 'refactor(db): schema migration (TPL-5001)');

      writeOverride(dir, {
        slice_id: 'TPL-5001',
        timestamp: new Date(Date.now() + 30_000).toISOString(), // 30 seconds in future
        reason: 'History restoration — ceremony failed after commit landed',
        category: 'history-restoration',
      });

      const result = await checkSliceIdUniqueness('TPL-5001', {
        repoRoot: dir,
        coaDir: join(dir, '.coa'),
      });

      assert.equal(result.ok, false);
      assert.equal(result.reason, 'duplicate-slice-id');
      assert.match(result.overrideReason, /timestamp-in-future|future/i);
    } finally {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });
});
