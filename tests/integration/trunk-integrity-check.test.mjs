/* @HEADER
 * @version 0.7.74 | 2026-05-04
 * @purpose Integration tests for scripts/checks/trunk-integrity-check.mjs — proves force-push to trunk is refused, normal pushes pass, and operator override is audited.
 * @sidecar trunk-integrity-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx trunk-integrity
 * @public false
 * @edit careful
 */

/**
 * Integration test (R8.5 / TPL-259).
 *
 * Each scenario builds an isolated tmp git repo, then invokes
 * trunk-integrity-check as a subprocess with fabricated stdin refspecs.
 * Ancestry checks are real git calls operating in the tmpdir repo.
 * Tests prove CLI behaviour under real git ancestry conditions.
 *
 * Git calls use safeGitSpawn (R1, ADR-0015).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const CHECK = join(REPO_ROOT, 'scripts', 'checks', 'trunk-integrity-check.mjs');
const LIB = join(REPO_ROOT, 'scripts', 'lib', 'trunk-integrity.mjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal workspace with copies of the check + lib scripts. */
function makeTempWorkspace(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `ti-int-${suffix}-`));
  mkdirSync(join(dir, '.claims'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'checks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
  cpSync(CHECK, join(dir, 'scripts', 'checks', 'trunk-integrity-check.mjs'));
  cpSync(LIB, join(dir, 'scripts', 'lib', 'trunk-integrity.mjs'));
  return dir;
}

/** Initialise a git repo and create an initial commit; return HEAD SHA. */
function initGitRepo(dir) {
  safeGitSpawn(dir, ['init', '-b', 'main'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.email', 'test@example.com'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.name', 'Test'], { stdio: 'pipe' });
  writeFileSync(join(dir, 'README.md'), '# test\n');
  safeGitSpawn(dir, ['add', 'README.md'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', 'init'], { stdio: 'pipe' });
  return getHEAD(dir);
}

/** Return the current HEAD SHA (trimmed). */
function getHEAD(dir) {
  const r = safeGitSpawn(dir, ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

/** Create a new commit with a file in the repo; return HEAD SHA. */
function makeCommit(dir, filename, content = 'content\n') {
  writeFileSync(join(dir, filename), content);
  safeGitSpawn(dir, ['add', filename], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', `add ${filename}`], { stdio: 'pipe' });
  return getHEAD(dir);
}

/**
 * Create an orphan commit (no parent) on a new branch; return its SHA.
 * The caller's HEAD is restored to the original branch after.
 */
function makeOrphanCommit(dir) {
  safeGitSpawn(dir, ['checkout', '--orphan', 'orphan-tmp'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['rm', '-rf', '.'], { stdio: 'pipe' });
  writeFileSync(join(dir, 'orphan.txt'), 'orphan\n');
  safeGitSpawn(dir, ['add', 'orphan.txt'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', 'orphan'], { stdio: 'pipe' });
  const orphanSha = getHEAD(dir);
  safeGitSpawn(dir, ['checkout', 'main'], { stdio: 'pipe' });
  return orphanSha;
}

/**
 * Run trunk-integrity-check as a subprocess with fabricated stdin refspecs.
 * Returns { code, payload }.
 */
function runCheck(cwd, stdinRefspecs, extraEnv = {}) {
  const checkScript = join(cwd, 'scripts', 'checks', 'trunk-integrity-check.mjs');
  const r = spawnSync(process.execPath, [checkScript, '--json'], {
    cwd,
    encoding: 'utf8',
    input: stdinRefspecs,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  let payload = null;
  try { payload = JSON.parse(r.stdout || '{}'); } catch { /* leave null */ }
  return { code: r.status, payload };
}

/** Build a refspec stdin line. */
function refspecLine(localRef, localSha, remoteRef, remoteSha) {
  return `${localRef} ${localSha} ${remoteRef} ${remoteSha}\n`;
}

const ZERO_SHA = '0000000000000000000000000000000000000000';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('trunk-integrity-check integration', () => {
  test('allows normal (non-force) push to trunk — remote is ancestor of local', () => {
    const dir = makeTempWorkspace('normal');
    try {
      const sha1 = initGitRepo(dir);
      const sha2 = makeCommit(dir, 'second.txt');
      // Remote has sha1, local has sha2 (sha2 descends from sha1) → fast-forward
      const stdin = refspecLine('refs/heads/main', sha2, 'refs/heads/main', sha1);
      const { code, payload } = runCheck(dir, stdin);
      assert.equal(code, 0, 'normal fast-forward push should be allowed');
      assert.equal(payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('refuses force-push to trunk — remote SHA is NOT ancestor of local', () => {
    const dir = makeTempWorkspace('force');
    try {
      const sha1 = initGitRepo(dir);
      const orphanSha = makeOrphanCommit(dir);
      // Remote has sha1, local has orphanSha (no ancestry relation) → force-push
      const stdin = refspecLine('refs/heads/main', orphanSha, 'refs/heads/main', sha1);
      const { code, payload } = runCheck(dir, stdin);
      assert.equal(code, 1, 'force-push to trunk must be refused');
      assert.equal(payload?.ok, false);
      assert.equal(payload?.denied, true);
      assert.ok(payload?.reason?.includes('force-push'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('allows force-push to non-trunk branch — no policy on feature branches', () => {
    const dir = makeTempWorkspace('feature');
    try {
      const sha1 = initGitRepo(dir);
      const orphanSha = makeOrphanCommit(dir);
      // Force-push targeting a feature branch — NOT trunk → allowed
      const stdin = refspecLine('refs/heads/feature-x', orphanSha, 'refs/heads/feature-x', sha1);
      const { code, payload } = runCheck(dir, stdin);
      assert.equal(code, 0, 'force-push to non-trunk branch should be allowed');
      assert.equal(payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('allows first push to new trunk branch (remote SHA = all-zero)', () => {
    const dir = makeTempWorkspace('firstpush');
    try {
      const sha1 = initGitRepo(dir);
      // Remote SHA is ZERO_SHA — first push to a new branch, not a force-push
      const stdin = refspecLine('refs/heads/main', sha1, 'refs/heads/main', ZERO_SHA);
      const { code, payload } = runCheck(dir, stdin);
      assert.equal(code, 0, 'first push to new branch should be allowed');
      assert.equal(payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('allows force-push to trunk with valid operator override — audits to .claims/audit.log', () => {
    const dir = makeTempWorkspace('override');
    try {
      const sha1 = initGitRepo(dir);
      const orphanSha = makeOrphanCommit(dir);
      const stdin = refspecLine('refs/heads/main', orphanSha, 'refs/heads/main', sha1);
      const { code, payload } = runCheck(dir, stdin, {
        COA_OPERATOR: '1',
        COA_FORCE_TRUNK: '1',
      });
      assert.equal(code, 0, 'operator override should allow force-push');
      assert.equal(payload?.ok, true);
      assert.equal(payload?.operatorOverride, true);
      // Audit record should have been written
      const logContent = readFileSync(join(dir, '.claims', 'audit.log'), 'utf8');
      assert.ok(logContent.includes('force-trunk-override'), 'audit log should contain override event');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('ok with no stdin (empty refspecs) — nothing to gate', () => {
    const dir = makeTempWorkspace('empty');
    try {
      initGitRepo(dir);
      const { code, payload } = runCheck(dir, '');
      assert.equal(code, 0, 'empty stdin should not block');
      assert.equal(payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
