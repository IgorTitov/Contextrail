/* @HEADER
 * @version 0.7.70 | 2026-05-03
 * @purpose Integration tests for scripts/checks/bypass-audit-check.mjs — proves --no-verify bypasses are flagged, normal commits pass, and COA_SKIP_GATES skips are recorded but not flagged.
 * @sidecar bypass-audit-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx bypass-audit
 * @public false
 * @edit careful
 */

/**
 * Integration test (R8.4 / TPL-258).
 *
 * Each scenario builds its own isolated tmp directory with a .claims/
 * subdirectory containing a fabricated commit-audit.log, then invokes
 * bypass-audit-check as a subprocess (spawnSync) against a fabricated git
 * repo. Tests prove CLI behaviour, not internal function calls.
 *
 * Git calls use safeGit / safeGitSpawn (R1, ADR-0015).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const CHECK = join(REPO_ROOT, 'scripts', 'checks', 'bypass-audit-check.mjs');
const LIB = join(REPO_ROOT, 'scripts', 'lib', 'bypass-audit.mjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal workspace with copies of the check + lib scripts. */
function makeTempWorkspace(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `ba-int-${suffix}-`));
  mkdirSync(join(dir, '.claims'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'checks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
  cpSync(CHECK, join(dir, 'scripts', 'checks', 'bypass-audit-check.mjs'));
  cpSync(LIB, join(dir, 'scripts', 'lib', 'bypass-audit.mjs'));
  return dir;
}

/**
 * Initialise a bare git repo in dir and create an initial commit.
 * Returns the HEAD commit SHA after the commit.
 */
function initGitRepo(dir) {
  safeGitSpawn(dir, ['init', '-b', 'main'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.email', 'test@example.com'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.name', 'Test'], { stdio: 'pipe' });
  writeFileSync(join(dir, 'README.md'), '# test\n');
  safeGitSpawn(dir, ['add', 'README.md'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', 'init'], { stdio: 'pipe' });
  return getHEAD(dir);
}

/** Return the current HEAD SHA (string, trimmed). */
function getHEAD(dir) {
  const r = safeGitSpawn(dir, ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

/** Return the SHA at HEAD~N. */
function getParentSHA(dir, n = 1) {
  const r = safeGitSpawn(dir, ['rev-parse', `HEAD~${n}`], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

/** Write a complete audit log from an array of record objects. */
function writeAuditLog(dir, records) {
  const logPath = join(dir, '.claims', 'commit-audit.log');
  const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(logPath, content);
}

/** Run bypass-audit-check as a subprocess, return { code, payload }. */
function runCheck(cwd, extraArgs = []) {
  const checkScript = join(cwd, 'scripts', 'checks', 'bypass-audit-check.mjs');
  const r = spawnSync(process.execPath, [checkScript, '--json', ...extraArgs], {
    cwd,
    encoding: 'utf8',
  });
  let payload = null;
  try { payload = JSON.parse(r.stdout || '{}'); } catch { /* leave null */ }
  return { code: r.status, payload };
}

/** Helper: make a second commit (simulates a --no-verify bypass commit). */
function makeCommit(dir, filename) {
  writeFileSync(join(dir, filename), `content of ${filename}\n`);
  safeGitSpawn(dir, ['add', filename], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', `add ${filename}`], { stdio: 'pipe' });
  return getHEAD(dir);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('bypass-audit-check integration', () => {
  test('skips cleanly when no audit log exists (fresh clone / pre-R8.4 history)', () => {
    const dir = makeTempWorkspace('no-log');
    try {
      initGitRepo(dir);
      // No .claims/commit-audit.log written
      const { code, payload } = runCheck(dir);
      assert.equal(code, 0, 'should exit 0 when no audit log');
      assert.equal(payload?.ok, true);
      assert.equal(payload?.skipped, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('happy path: passes when all recent commits have complete audit records', () => {
    const dir = makeTempWorkspace('happy');
    try {
      const sha = initGitRepo(dir);
      writeAuditLog(dir, [{
        ts: '2026-05-04T10:00:00Z',
        phases: ['1.0', '2.5', '7', '1', '2', '3', '4', '5', '6', '8'],
        skipped: [],
        skipReason: '',
        commitSha: sha,
      }]);

      const { code, payload } = runCheck(dir, ['--recent=5']);
      assert.equal(code, 0, 'should exit 0 when all commits have records');
      assert.equal(payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('regression: detects --no-verify bypass commit (no audit record)', () => {
    const dir = makeTempWorkspace('bypass');
    try {
      const sha1 = initGitRepo(dir);
      // Second commit — simulates git commit --no-verify (no hooks ran, no audit record)
      const sha2 = makeCommit(dir, 'extra.txt');

      // Only write audit record for sha1, not sha2
      writeAuditLog(dir, [{
        ts: '2026-05-04T10:00:00Z',
        phases: ['1.0', '2.5', '7'],
        skipped: [],
        skipReason: '',
        commitSha: sha1,
      }]);

      const { code, payload } = runCheck(dir, ['--recent=5']);
      assert.equal(code, 1, 'should exit 1 when a commit has no audit record');
      assert.equal(payload?.ok, false);
      assert.ok(payload?.gaps?.length > 0, 'gaps array should be non-empty');
      const gapShas = payload.gaps.map(g => g.sha);
      assert.ok(gapShas.includes(sha2), `sha2 (${sha2.slice(0, 8)}) should be in gaps`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--warn-only exits 0 even when gaps exist', () => {
    const dir = makeTempWorkspace('warnonly');
    try {
      initGitRepo(dir);
      // Audit log has a record for a different SHA, not HEAD
      writeAuditLog(dir, [{
        ts: '2026-05-04T10:00:00Z',
        phases: ['1.0', '2.5', '7'],
        skipped: [],
        skipReason: '',
        commitSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      }]);

      const { code, payload } = runCheck(dir, ['--recent=5', '--warn-only']);
      assert.equal(code, 0, '--warn-only must exit 0 even with gaps');
      assert.equal(payload?.ok, false, 'ok should still be false to indicate gaps');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('COA_SKIP_GATES: skippable phases skipped, non-skippable present → check passes', () => {
    const dir = makeTempWorkspace('skipgates');
    try {
      const sha = initGitRepo(dir);
      // NON_SKIPPABLE phases (1.0, 2.5, 7) ran; skippable phases (1,2,3...) were skipped
      writeAuditLog(dir, [{
        ts: '2026-05-04T10:00:00Z',
        phases: ['1.0', '2.5', '7'],
        skipped: ['1', '2', '3', '4', '5', '6', '8'],
        skipReason: '1,2,3,4,5,6,8',
        commitSha: sha,
      }]);

      const { code, payload } = runCheck(dir, ['--recent=5']);
      assert.equal(code, 0, 'COA_SKIP_GATES of non-critical phases should not trigger a failure');
      assert.equal(payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('flags commit where NON_SKIPPABLE phase is missing from the audit record', () => {
    const dir = makeTempWorkspace('missing-ns');
    try {
      const sha = initGitRepo(dir);
      // Record that has phases 1.0 and 2.5 but is missing phase 7
      writeAuditLog(dir, [{
        ts: '2026-05-04T10:00:00Z',
        phases: ['1.0', '2.5'],
        skipped: ['7'],
        skipReason: '7',
        commitSha: sha,
      }]);

      const { code, payload } = runCheck(dir, ['--recent=5']);
      assert.equal(code, 1, 'should fail when NON_SKIPPABLE phase is missing from record');
      assert.equal(payload?.ok, false);
      assert.ok(payload?.incomplete?.length > 0, 'incomplete array should be non-empty');
      assert.ok(payload.incomplete[0].missing.includes('7'), '7 should be in missing list');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--recent=1 only checks the single most recent commit', () => {
    const dir = makeTempWorkspace('recent1');
    try {
      initGitRepo(dir);
      const sha1 = getHEAD(dir);

      // Second commit — no audit record for sha1
      const sha2 = makeCommit(dir, 'second.txt');

      // Write audit record only for sha2 (the most recent)
      writeAuditLog(dir, [{
        ts: '2026-05-04T10:00:00Z',
        phases: ['1.0', '2.5', '7'],
        skipped: [],
        skipReason: '',
        commitSha: sha2,
      }]);

      // --recent=1 checks only sha2 → has record → pass
      const r1 = runCheck(dir, ['--recent=1']);
      assert.equal(r1.code, 0, '--recent=1 should pass when the most recent commit has a record');

      // --recent=2 checks sha1 and sha2; sha1 has no record → fail
      const r2 = runCheck(dir, ['--recent=2']);
      assert.equal(r2.code, 1, '--recent=2 should fail because sha1 has no record');
      const gapShas = r2.payload?.gaps?.map(g => g.sha) ?? [];
      assert.ok(gapShas.includes(sha1), `sha1 (${sha1.slice(0, 8)}) should be in gaps`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
