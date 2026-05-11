/* @HEADER
 * @version 0.8.11 | 2026-05-11
 * @purpose Integration tests for R5 rationale-file override flow — end-to-end: override file consumed, log entry appears, override file deleted; COA_OPERATOR=1 alone refused.
 * @sidecar r5-guard-rationale-flow.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Integration test (R5 / ADR-0047 / TPL-329).
 *
 * Each scenario builds its own isolated tmpdir workspace with the guard
 * and override-lib scripts copied in. A minimal git repo is initialised
 * so `git rev-parse --show-toplevel` returns the tmpdir root (not a
 * transport worktree — no `-tx-[A-Z]` suffix).
 *
 * Git calls use safeGitSpawn (R1, ADR-0015).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readdirSync,
  existsSync, rmSync, cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const GUARD = join(REPO_ROOT, 'scripts', 'checks', 'main-worktree-guard.mjs');
const LIB_OVERRIDE = join(REPO_ROOT, 'scripts', 'lib', 'r5-override.mjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempWorkspace(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `r5-int-${suffix}-`));
  mkdirSync(join(dir, '.coa'), { recursive: true });
  mkdirSync(join(dir, '.coa', 'r5-override-log'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'checks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
  cpSync(GUARD, join(dir, 'scripts', 'checks', 'main-worktree-guard.mjs'));
  cpSync(LIB_OVERRIDE, join(dir, 'scripts', 'lib', 'r5-override.mjs'));
  return dir;
}

function initGitRepo(dir) {
  safeGitSpawn(dir, ['init', '-b', 'main'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.email', 'test@example.com'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['config', 'user.name', 'Test'], { stdio: 'pipe' });
  writeFileSync(join(dir, 'placeholder.txt'), 'placeholder\n');
  safeGitSpawn(dir, ['add', 'placeholder.txt'], { stdio: 'pipe' });
  safeGitSpawn(dir, ['commit', '--no-verify', '-m', 'init'], { stdio: 'pipe' });
}

function stageFile(dir, name, content = 'content\n') {
  writeFileSync(join(dir, name), content);
  safeGitSpawn(dir, ['add', name], { stdio: 'pipe' });
}

function writeOverride(dir, obj) {
  writeFileSync(join(dir, '.coa', 'r5-override.json'), JSON.stringify(obj, null, 2), 'utf8');
}

function freshTimestamp() {
  return new Date().toISOString();
}

function runGuard(dir, extraEnv = {}) {
  const guardScript = join(dir, 'scripts', 'checks', 'main-worktree-guard.mjs');
  return spawnSync(process.execPath, [guardScript], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

function logFiles(dir) {
  const logDir = join(dir, '.coa', 'r5-override-log');
  if (!existsSync(logDir)) return [];
  return readdirSync(logDir).filter(f => f !== '.gitkeep');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('R5 rationale-file override flow', () => {
  test('valid override file → guard exits 0, log entry created, override file deleted', () => {
    const dir = makeTempWorkspace('valid');
    try {
      initGitRepo(dir);
      stageFile(dir, 'hotfix.mjs');

      writeOverride(dir, {
        timestamp: freshTimestamp(),
        slice_id: 'TPL-329',
        reason: 'Emergency hotfix: transport ceremony unavailable due to corrupted worktree state.',
        expected_files: ['hotfix.mjs'],
        category: 'hotfix-trunk-blocked',
      });

      const result = runGuard(dir);
      assert.equal(result.status, 0,
        `Guard should exit 0 with valid override.\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('[R5] Override accepted'),
        `Expected acceptance message.\nstderr: ${result.stderr}`);

      // Override file consumed
      assert.equal(existsSync(join(dir, '.coa', 'r5-override.json')), false,
        'Override file should be deleted after consumption');

      // Log entry created
      const files = logFiles(dir);
      assert.equal(files.length, 1, 'Exactly one log entry should be created');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('no override file → guard exits 1 with proper-path message', () => {
    const dir = makeTempWorkspace('nofile');
    try {
      initGitRepo(dir);
      stageFile(dir, 'feature.mjs');

      const result = runGuard(dir);
      assert.equal(result.status, 1,
        `Guard should exit 1 without override file.\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('[R5] Direct commit to main worktree is forbidden'),
        `Expected refusal message.\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('coa-worktree.mjs'),
        `Refusal should suggest coa-worktree.mjs.\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('coa-merge.mjs'),
        `Refusal should suggest coa-merge.mjs.\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('r5-override-emergency.md'),
        `Refusal should reference emergency guide.\nstderr: ${result.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('COA_OPERATOR=1 without override file → guard exits 1 (regression: old bypass closed)', () => {
    const dir = makeTempWorkspace('operator-no-file');
    try {
      initGitRepo(dir);
      stageFile(dir, 'feature.mjs');

      const result = runGuard(dir, { COA_OPERATOR: '1' });
      assert.equal(result.status, 1,
        `COA_OPERATOR=1 alone must NOT bypass R5.\nstderr: ${result.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('TTL-expired override file → guard exits 1', () => {
    const dir = makeTempWorkspace('expired');
    try {
      initGitRepo(dir);
      stageFile(dir, 'fix.mjs');

      writeOverride(dir, {
        timestamp: new Date(Date.now() - 70_000).toISOString(), // 70s ago → expired
        slice_id: 'TPL-329',
        reason: 'Emergency hotfix: transport ceremony unavailable due to corrupted worktree state.',
        expected_files: ['fix.mjs'],
        category: 'hotfix-trunk-blocked',
      });

      const result = runGuard(dir);
      assert.equal(result.status, 1,
        `Guard should exit 1 with expired override.\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('TTL expired'),
        `Should mention TTL expiry.\nstderr: ${result.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('staged file not in expected_files → guard exits 1', () => {
    const dir = makeTempWorkspace('coverage');
    try {
      initGitRepo(dir);
      stageFile(dir, 'file-a.mjs');
      stageFile(dir, 'file-b.mjs');

      writeOverride(dir, {
        timestamp: freshTimestamp(),
        slice_id: 'TPL-329',
        reason: 'Emergency hotfix: transport ceremony unavailable due to corrupted worktree state.',
        expected_files: ['file-a.mjs'], // file-b.mjs not declared
        category: 'hotfix-trunk-blocked',
      });

      const result = runGuard(dir);
      assert.equal(result.status, 1,
        `Guard should exit 1 when coverage is insufficient.\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('file-b.mjs'),
        `Refusal should name uncovered file.\nstderr: ${result.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('after consumption, log file is staged in the git index', () => {
    // Gap 3 (TPL-331): after a successful override, the guard must git-add the
    // log file so the audit trail lands in the commit atomically.
    const dir = makeTempWorkspace('autostage');
    try {
      initGitRepo(dir);
      stageFile(dir, 'hotfix.mjs');

      writeOverride(dir, {
        timestamp: freshTimestamp(),
        slice_id: 'TPL-331',
        reason: 'Emergency hotfix: testing auto-stage of log file after override consumption.',
        expected_files: ['hotfix.mjs'],
        category: 'hotfix-trunk-blocked',
      });

      const result = runGuard(dir);
      assert.equal(result.status, 0,
        `Guard should exit 0 with valid override.\nstderr: ${result.stderr}`);

      // Verify log file is in the git index (staged).
      const staged = safeGitSpawn(dir, ['diff', '--cached', '--name-only'], { stdio: 'pipe' });
      const stagedFiles = staged.stdout.trim().split('\n').filter(Boolean);
      const logFileStaged = stagedFiles.some(f => f.startsWith('.coa/r5-override-log/'));
      assert.ok(
        logFileStaged,
        `Log file must be staged after override consumption.\nStaged files: ${stagedFiles.join(', ')}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('transport worktree — guard exits 0 without checking override file', () => {
    // Verify transport worktrees are still fast-pathed (no override needed).
    // We rename the tmpdir to look like a transport worktree by testing the
    // isTransportWorktree logic: a tx-<UPPER> suffix triggers fast-pass.
    // Instead of renaming the dir (platform issues), we verify via --self-test
    // that the pure function correctly classifies transport paths. This
    // complements the unit test in main-worktree-guard.test.mjs.
    const guardScript = join(REPO_ROOT, 'scripts', 'checks', 'main-worktree-guard.mjs');
    const r = spawnSync(process.execPath, [guardScript, '--self-test'], {
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, `self-test should exit 0.\nstderr: ${r.stderr}`);
    assert.ok(r.stderr.includes('All'), `Expected "All N cases passed".\nstderr: ${r.stderr}`);
  });
});
