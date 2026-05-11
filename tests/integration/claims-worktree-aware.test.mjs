/* @HEADER
 * @version 0.7.97 | 2026-05-05
 * @purpose Prove that claim-check and resolveMainRepoRoot() correctly discover .claims/ from a linked git worktree (TPL-288).
 * @sidecar claims-worktree-aware.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-288: worktree-aware claims discovery.
 *
 * Linked git worktrees do not share untracked files (.claims/*.json lives in
 * the main repo's .claims/, not in tx-<slice>/.claims/). Tools that resolved
 * .claims/ relative to process.cwd() or the script location missed active
 * claims when invoked from a tx-worktree.
 *
 * Fix: `resolveMainRepoRoot()` uses `git rev-parse --git-common-dir` to find
 * the main repo root from any worktree, then builds CLAIMS_DIR from it.
 *
 * Test cases:
 *   1. Unit — resolveMainRepoRoot() in main repo returns same root
 *   2. Unit — resolveMainRepoRoot() in linked worktree returns main repo root
 *   3. Unit — resolveMainRepoRoot() in non-git dir returns input (fallback)
 *   4. Unit — resolveMainRepoRoot() with non-existent path returns it (catch)
 *   5. Integration — claim-check --enforce from tx-worktree finds claim in main .claims/
 *   6. Integration — claim-check --enforce from main repo finds claim (regression)
 *   7. Integration — CLAIMS_DIR env override still honoured
 *   8. Integration — non-git directory: graceful fallback, no crash
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeGitSpawn, SAFE_GIT_ENV_KEYS } from '../_setup/safe-git.mjs';
import { resolveMainRepoRoot } from '../../scripts/lib/fs-helpers.mjs';

const claimCheckPath = fileURLToPath(
  new URL('../../scripts/checks/claim-check.mjs', import.meta.url),
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createMainRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'cwa-main-'));
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'test@test.local']);
  safeGitSpawn(dir, ['config', 'user.name', 'test-bot']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# test\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}

function writeActiveClaim(claimsDir, id, targetPath) {
  mkdirSync(claimsDir, { recursive: true });
  writeFileSync(
    join(claimsDir, `${id}.json`),
    JSON.stringify(
      {
        id,
        agent: 'fixture-agent',
        slice: 'CWA-FIXTURE',
        created: new Date().toISOString(),
        expires: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        status: 'active',
        targets: [{ path: targetPath, action: 'modify' }],
        strategy: 'modify-in-place',
        dependsOn: [],
      },
      null,
      2,
    ) + '\n',
  );
}

function runClaimCheck(cwd, args, extraEnv = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.COA_OPERATOR;
  for (const key of SAFE_GIT_ENV_KEYS) {
    delete baseEnv[key];
  }
  return spawnSync(process.execPath, [claimCheckPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...baseEnv, ...extraEnv },
  });
}

// ---------------------------------------------------------------------------
// Unit tests: resolveMainRepoRoot()
// ---------------------------------------------------------------------------

test('TPL-288 unit: main repo — resolveMainRepoRoot returns same root', () => {
  const dir = createMainRepo();
  try {
    const result = resolveMainRepoRoot(dir);
    assert.equal(result, dir, 'main repo root must equal input');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('TPL-288 unit: linked worktree — resolveMainRepoRoot returns main repo root', () => {
  const mainDir = createMainRepo();
  const txPath = join(tmpdir(), `cwa-tx-unit-${Date.now()}`);
  try {
    safeGitSpawn(mainDir, ['worktree', 'add', '-b', 'tx-cwa-unit', txPath, 'HEAD']);
    const result = resolveMainRepoRoot(txPath);
    assert.equal(result, mainDir, 'linked worktree must resolve to main repo root');
  } finally {
    try {
      safeGitSpawn(mainDir, ['worktree', 'remove', '--force', txPath]);
    } catch { /* best-effort */ }
    try {
      rmSync(txPath, { recursive: true, force: true });
    } catch { /* best-effort */ }
    rmSync(mainDir, { recursive: true, force: true });
  }
});

test('TPL-288 unit: non-git directory — resolveMainRepoRoot returns input (fallback)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cwa-nongit-'));
  try {
    const result = resolveMainRepoRoot(dir);
    assert.equal(result, dir, 'non-git dir fallback must return the input path');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('TPL-288 unit: non-existent path — resolveMainRepoRoot returns input (catch path)', () => {
  const fakePath = join(tmpdir(), `cwa-nonexistent-${Date.now()}`);
  // git will fail (no such cwd) → catch branch returns worktreeRoot
  const result = resolveMainRepoRoot(fakePath);
  assert.equal(result, fakePath, 'catch branch must return the input path');
});

// ---------------------------------------------------------------------------
// Integration tests: claim-check worktree-aware CLAIMS_DIR discovery
// ---------------------------------------------------------------------------

test('TPL-288 int: linked worktree — claim-check --enforce finds claim in main .claims/', () => {
  const mainDir = createMainRepo();
  const txPath = join(tmpdir(), `cwa-tx-int-${Date.now()}`);
  try {
    safeGitSpawn(mainDir, ['worktree', 'add', '-b', 'tx-cwa-int', txPath, 'HEAD']);

    // Claim lives only in the main repo's .claims/ — tx-worktree has none
    writeActiveClaim(join(mainDir, '.claims'), 'clm-cwa-int-001', 'src/shared.mjs');

    // Run claim-check from the tx-worktree — must detect conflict
    const result = runClaimCheck(txPath, [
      '--targets=src/shared.mjs',
      '--action=modify',
      '--enforce',
    ]);

    assert.equal(
      result.status,
      1,
      'enforce must exit 1: claim in main .claims/ must be visible from tx-worktree',
    );
    const combined = result.stdout + result.stderr;
    assert.match(
      combined,
      /clm-cwa-int-001|CONFLICT/,
      'output must reference the claim from main .claims/',
    );
  } finally {
    try {
      safeGitSpawn(mainDir, ['worktree', 'remove', '--force', txPath]);
    } catch { /* best-effort */ }
    try {
      rmSync(txPath, { recursive: true, force: true });
    } catch { /* best-effort */ }
    rmSync(mainDir, { recursive: true, force: true });
  }
});

test('TPL-288 int: main repo — claim-check --enforce finds claim (regression)', () => {
  const mainDir = createMainRepo();
  try {
    writeActiveClaim(join(mainDir, '.claims'), 'clm-cwa-main-001', 'src/main-target.mjs');

    const result = runClaimCheck(mainDir, [
      '--targets=src/main-target.mjs',
      '--action=modify',
      '--enforce',
    ]);

    assert.equal(result.status, 1, 'main repo: enforce must exit 1 when claim is present');
    const combined = result.stdout + result.stderr;
    assert.match(combined, /clm-cwa-main-001|CONFLICT/, 'must name the conflicting claim');
  } finally {
    rmSync(mainDir, { recursive: true, force: true });
  }
});

test('TPL-288 int: CLAIMS_DIR env override — explicit path is honoured', () => {
  const mainDir = createMainRepo();
  const overrideDir = mkdtempSync(join(tmpdir(), 'cwa-override-'));
  try {
    // Claim only in overrideDir — nothing in mainDir/.claims/
    writeActiveClaim(overrideDir, 'clm-cwa-override-001', 'src/override.mjs');

    const result = runClaimCheck(mainDir, ['--targets=src/override.mjs', '--action=modify', '--enforce'], {
      CLAIMS_DIR: overrideDir,
    });

    assert.equal(result.status, 1, 'CLAIMS_DIR override: claim in override dir must be found');
    const combined = result.stdout + result.stderr;
    assert.match(combined, /clm-cwa-override-001|CONFLICT/, 'must reference the override claim');
  } finally {
    rmSync(mainDir, { recursive: true, force: true });
    rmSync(overrideDir, { recursive: true, force: true });
  }
});

test('TPL-288 int: non-git directory — claim-check exits cleanly (no crash)', () => {
  const nonGitDir = mkdtempSync(join(tmpdir(), 'cwa-nongit-cli-'));
  try {
    // No .claims/ here — no conflict → exits 0 (graceful fallback, not a crash)
    const result = runClaimCheck(nonGitDir, [
      '--targets=some/file.mjs',
      '--action=modify',
      '--enforce',
    ]);
    assert.equal(result.status, 0, 'non-git dir: must exit 0 gracefully (no claims = no conflict)');
  } finally {
    rmSync(nonGitDir, { recursive: true, force: true });
  }
});
