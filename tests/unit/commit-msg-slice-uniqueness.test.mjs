/* @HEADER
 * @version 0.8.12 | 2026-05-11
 * @purpose Unit tests for checkSliceIdUniqueness and the slice-ID uniqueness enforcement added in TPL-333 (ADR-0049).
 * @sidecar commit-msg-slice-uniqueness.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  checkSliceIdUniqueness,
  SLICE_ID_OVERRIDE_CATEGORIES,
  extractSliceIdFromHeader,
} from '../../scripts/checks/commit-msg-check.mjs';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempRepo(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `cmu-unit-${suffix}-`));
  mkdirSync(join(dir, '.coa'), { recursive: true });
  mkdirSync(join(dir, '.coa', 'slice-id-override-log'), { recursive: true });
  safeGitSpawn(dir, ['init', '-b', 'main'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.email', 'test@example.com'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.name', 'Test'], { stdio: 'pipe' });
  // Initial commit so git log works
  writeFileSync(join(dir, 'init.txt'), 'init\n');
  safeGitSpawn(dir, ['add', 'init.txt'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', 'chore: init repo'], { stdio: 'pipe' });
  return dir;
}

function commitWithSubject(dir, subject) {
  writeFileSync(join(dir, `f-${Date.now()}.txt`), 'x\n');
  safeGitSpawn(dir, ['add', '.'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', subject], { stdio: 'pipe' });
}

function writeOverride(dir, obj) {
  writeFileSync(join(dir, '.coa', 'slice-id-override.json'), JSON.stringify(obj, null, 2), 'utf8');
}

function freshTimestamp() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// SLICE_ID_OVERRIDE_CATEGORIES
// ---------------------------------------------------------------------------

describe('SLICE_ID_OVERRIDE_CATEGORIES', () => {
  test('includes legitimate-reuse, history-restoration, testing', () => {
    assert.ok(SLICE_ID_OVERRIDE_CATEGORIES.includes('legitimate-reuse'));
    assert.ok(SLICE_ID_OVERRIDE_CATEGORIES.includes('history-restoration'));
    assert.ok(SLICE_ID_OVERRIDE_CATEGORIES.includes('testing'));
    assert.equal(SLICE_ID_OVERRIDE_CATEGORIES.length, 3);
  });
});

// ---------------------------------------------------------------------------
// checkSliceIdUniqueness — happy paths
// ---------------------------------------------------------------------------

describe('checkSliceIdUniqueness — no duplicate', () => {
  let dir;
  before(() => {
    dir = makeTempRepo('no-dup');
  });
  after(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  test('returns ok when slice ID is not in history', async () => {
    const result = await checkSliceIdUniqueness('TPL-999', {
      repoRoot: dir,
      coaDir: join(dir, '.coa'),
    });
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'no-duplicate');
  });

  test('returns ok for a chore commit with no slice ID', async () => {
    // This tests the caller; if sliceId is null, caller skips. But if somehow called with
    // a value not in history, it still returns ok.
    const result = await checkSliceIdUniqueness('ZZZ-001', {
      repoRoot: dir,
      coaDir: join(dir, '.coa'),
    });
    assert.equal(result.ok, true);
  });
});

// ---------------------------------------------------------------------------
// checkSliceIdUniqueness — duplicate detected, no override
// ---------------------------------------------------------------------------

describe('checkSliceIdUniqueness — duplicate in history, no override', () => {
  let dir;
  before(() => {
    dir = makeTempRepo('dup-no-ovr');
    commitWithSubject(dir, 'feat(auth): add token rotation (TPL-500)');
  });
  after(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  test('returns ok=false with duplicate-slice-id reason', async () => {
    const result = await checkSliceIdUniqueness('TPL-500', {
      repoRoot: dir,
      coaDir: join(dir, '.coa'),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'duplicate-slice-id');
    assert.ok(result.duplicate, 'should include duplicate info');
    assert.ok(result.duplicate.hash, 'should include commit hash');
    assert.ok(result.duplicate.subject.includes('TPL-500'));
  });

  test('does not confuse partial matches (TPL-5000 does not match TPL-500)', async () => {
    const result = await checkSliceIdUniqueness('TPL-5000', {
      repoRoot: dir,
      coaDir: join(dir, '.coa'),
    });
    assert.equal(result.ok, true);
  });
});

// ---------------------------------------------------------------------------
// checkSliceIdUniqueness — duplicate + valid override
// ---------------------------------------------------------------------------

describe('checkSliceIdUniqueness — duplicate + valid override', () => {
  let dir;
  before(() => {
    dir = makeTempRepo('dup-ovr-ok');
    commitWithSubject(dir, 'feat(state): observable reducer (TPL-600)');
  });
  after(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  test('accepts a fresh valid override and archives it', async () => {
    writeOverride(dir, {
      slice_id: 'TPL-600',
      timestamp: freshTimestamp(),
      reason: 'History restoration after ceremony failure',
      category: 'history-restoration',
    });
    const result = await checkSliceIdUniqueness('TPL-600', {
      repoRoot: dir,
      coaDir: join(dir, '.coa'),
    });
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'override-accepted');
    // Override file should be deleted
    assert.ok(
      !existsSync(join(dir, '.coa', 'slice-id-override.json')),
      'override file should be deleted',
    );
    // Log entry should exist
    const logFiles = (await import('node:fs')).readdirSync(
      join(dir, '.coa', 'slice-id-override-log'),
    );
    assert.ok(
      logFiles.some((f) => f.includes('TPL-600')),
      'log entry should be created',
    );
  });
});

// ---------------------------------------------------------------------------
// checkSliceIdUniqueness — duplicate + expired override
// ---------------------------------------------------------------------------

describe('checkSliceIdUniqueness — duplicate + expired TTL', () => {
  let dir;
  before(() => {
    dir = makeTempRepo('dup-ovr-ttl');
    commitWithSubject(dir, 'feat(cache): LRU eviction (TPL-700)');
  });
  after(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  test('rejects override with expired timestamp', async () => {
    const oldTs = new Date(Date.now() - 120_000).toISOString(); // 2 minutes ago
    writeOverride(dir, {
      slice_id: 'TPL-700',
      timestamp: oldTs,
      reason: 'Legitimate history restoration scenario',
      category: 'history-restoration',
    });
    const result = await checkSliceIdUniqueness('TPL-700', {
      repoRoot: dir,
      coaDir: join(dir, '.coa'),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'duplicate-slice-id');
    assert.ok(result.overrideReason, 'should include override rejection reason');
    assert.match(result.overrideReason, /TTL expired|older than 60/);
  });
});

// ---------------------------------------------------------------------------
// checkSliceIdUniqueness — duplicate + wrong category
// ---------------------------------------------------------------------------

describe('checkSliceIdUniqueness — duplicate + invalid category', () => {
  let dir;
  before(() => {
    dir = makeTempRepo('dup-ovr-cat');
    commitWithSubject(dir, 'fix(event-bus): race condition (TPL-800)');
  });
  after(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  test('rejects override with invalid category', async () => {
    writeOverride(dir, {
      slice_id: 'TPL-800',
      timestamp: freshTimestamp(),
      reason: 'Recovering from failed ceremony — need reuse',
      category: 'hotfix-trunk-blocked', // valid for r5 but not for slice-id override
    });
    const result = await checkSliceIdUniqueness('TPL-800', {
      repoRoot: dir,
      coaDir: join(dir, '.coa'),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'duplicate-slice-id');
    assert.ok(result.overrideReason);
    assert.match(result.overrideReason, /category/i);
  });
});

// ---------------------------------------------------------------------------
// extractSliceIdFromHeader — bypass prefixes
// ---------------------------------------------------------------------------

describe('extractSliceIdFromHeader — bypass prefixes', () => {
  test('returns null for Merge commits', () => {
    // Merge commits bypass the check in main(); extractSliceId is still tested here
    // to ensure the pattern doesn't match generic text.
    const id = extractSliceIdFromHeader('Merge branch feature/x into main');
    // 'main' doesn't match the ID pattern, but if there were an ID it would match.
    // The bypass is enforced in main(), not in extractSliceIdFromHeader.
    assert.equal(id, null);
  });

  test('extracts slice ID from conventional commit header', () => {
    const id = extractSliceIdFromHeader('feat(auth): add rotation (TPL-123)');
    assert.equal(id, 'TPL-123');
  });

  test('extracts multi-segment slice ID', () => {
    const id = extractSliceIdFromHeader('fix(cache): thing (AIC-DEV-167)');
    assert.equal(id, 'AIC-DEV-167');
  });

  test('returns null when no slice ID present', () => {
    const id = extractSliceIdFromHeader('chore: update dependencies');
    assert.equal(id, null);
  });
});
