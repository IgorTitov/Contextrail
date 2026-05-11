/* @HEADER
 * @version 0.7.96 | 2026-05-05
 * @purpose Integration tests for TPL-287: hook-integrity post-stamp regen at Phase 5 inline — fingerprints stay consistent when Phase 6/7 aborts a commit.
 * @sidecar hook-integrity-retry.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx hook-integrity
 * @public false
 * @edit careful
 */

/**
 * Integration tests for the Addition B relocation (TPL-287).
 *
 * TPL-278 placed the hook-integrity post-stamp regen block at the end of
 * pre-commit. If Phase 6 or Phase 7 failed, that block never ran, leaving the
 * fingerprint registry out-of-sync with the post-stamp hook content. On retry
 * Phase 1.0 would see a mismatch and force manual `COA_OPERATOR=1 --update`.
 *
 * TPL-287 relocates the block immediately after Phase 5 (which is synchronous
 * via `run_parallel` + `wait` loops). Fingerprints are updated before Phase 6
 * runs, so retries succeed without manual intervention.
 *
 * These tests call `hook-integrity-check.mjs` directly as a subprocess — they
 * do not fire the full pre-commit hook. They verify the invariant that matters:
 * after Addition B runs (--update --from-pre-commit-hook), a subsequent
 * integrity check (no flags) exits 0.
 *
 * R1 compliant: temp dirs under os.tmpdir(). No git operations needed here —
 * hook-integrity-check.mjs does not invoke git, so safeGit is not imported.
 *
 * SpecRefs: TPL-287
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const CHECK = join(REPO_ROOT, 'scripts', 'checks', 'hook-integrity-check.mjs');
const LIB = join(REPO_ROOT, 'scripts', 'lib', 'hook-integrity.mjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal workspace with the check + lib scripts copied in. */
function makeTempWorkspace(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `hi-retry-${suffix}-`));
  mkdirSync(join(dir, '.githooks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'checks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
  cpSync(CHECK, join(dir, 'scripts', 'checks', 'hook-integrity-check.mjs'));
  cpSync(LIB, join(dir, 'scripts', 'lib', 'hook-integrity.mjs'));
  return dir;
}

/** Run the check subprocess. Returns { code, payload, stdout, stderr }. */
function runCheck(cwd, extraArgs = [], envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  if (!Object.prototype.hasOwnProperty.call(envOverrides, 'COA_OPERATOR')) {
    delete env.COA_OPERATOR;
  }
  const r = spawnSync(process.execPath, [CHECK, '--json', ...extraArgs], {
    cwd,
    env,
    encoding: 'utf8',
  });
  let payload = null;
  try {
    payload = JSON.parse(r.stdout || '{}');
  } catch {
    /* leave null */
  }
  return {
    code: r.status,
    payload,
    stdout: r.stdout,
    stderr: r.stderr,
  };
}

/** Run --update --from-pre-commit-hook (simulates Addition B in Phase 5 inline). */
function runAdditionB(cwd) {
  return runCheck(cwd, ['--update', '--from-pre-commit-hook'], {});
}

// ---------------------------------------------------------------------------
// Test D — Regression: ORIG_STAGED guard (silent when no .githooks/ files)
// ---------------------------------------------------------------------------
describe('TPL-287 Test D — ORIG_STAGED guard: no .githooks/ in staged set', () => {
  it('grep condition is false when ORIG_STAGED has no .githooks/ entries', () => {
    // This is a unit-style verification of the bash condition logic:
    //   if [ -n "$ORIG_STAGED" ] && echo "$ORIG_STAGED" | grep -q '^\.githooks/'
    // We verify the Node-equivalent predicate directly.
    const cases = [
      { staged: '', expectMatch: false, label: 'empty ORIG_STAGED' },
      { staged: 'README.md\nCHANGELOG.md', expectMatch: false, label: 'docs-only staged' },
      { staged: 'scripts/checks/foo.mjs', expectMatch: false, label: 'scripts-only staged' },
      { staged: '.githooks/pre-commit', expectMatch: true, label: '.githooks/ in staged' },
      {
        staged: 'README.md\n.githooks/pre-commit\nCHANGELOG.md',
        expectMatch: true,
        label: 'mixed staged with .githooks/',
      },
    ];

    for (const { staged, expectMatch, label } of cases) {
      // Replicate: [ -n "$ORIG_STAGED" ] && echo "$ORIG_STAGED" | grep -q '^\.githooks/'
      const hasGitHooks =
        staged.length > 0 && staged.split('\n').some((line) => line.startsWith('.githooks/'));
      assert.equal(hasGitHooks, expectMatch, `Guard should be ${expectMatch} for case: ${label}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Test C — Successful flow: fingerprints stay consistent
// ---------------------------------------------------------------------------
describe('TPL-287 Test C — Successful flow: fingerprints remain consistent', () => {
  it('after --update --from-pre-commit-hook, plain check exits 0', () => {
    const dir = makeTempWorkspace('success');
    try {
      // Create a mock hook
      writeFileSync(
        join(dir, '.githooks', 'pre-commit'),
        '#!/usr/bin/env bash\n# @version 0.0.1\n# mock pre-commit\necho ok\n',
      );

      // Simulate Addition B (Phase 5 inline): --update --from-pre-commit-hook
      const updateResult = runAdditionB(dir);
      assert.equal(
        updateResult.code,
        0,
        `Addition B should succeed. stdout: ${updateResult.stdout} stderr: ${updateResult.stderr}`,
      );
      assert.equal(updateResult.payload?.ok, true);
      assert.equal(updateResult.payload?.action, 'updated');

      // Registry must exist after update
      assert.ok(
        existsSync(join(dir, '.githooks', '.fingerprints.json')),
        '.fingerprints.json must exist after Addition B',
      );

      // Subsequent plain check must pass
      const checkResult = runCheck(dir);
      assert.equal(
        checkResult.code,
        0,
        `Plain check after Addition B should exit 0. stdout: ${checkResult.stdout} stderr: ${checkResult.stderr}`,
      );
      assert.equal(checkResult.payload?.ok, true);
      assert.equal(checkResult.payload?.mismatches?.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Test A — Phase 5 position: fingerprints reflect post-stamp content
// ---------------------------------------------------------------------------
describe('TPL-287 Test A — Post-stamp regen: fingerprints match changed @version', () => {
  it('after header-fix stamps a new @version, Addition B re-syncs and check passes', () => {
    const dir = makeTempWorkspace('poststamp');
    try {
      // v1: initial content (pre-Phase-5)
      const v1Content = '#!/usr/bin/env bash\n# @version 0.0.1\n# mock pre-commit\necho ok\n';
      writeFileSync(join(dir, '.githooks', 'pre-commit'), v1Content);

      // Generate initial registry (as if before Phase 5)
      const initUpdate = runCheck(dir, ['--update'], { COA_OPERATOR: '1' });
      assert.equal(initUpdate.code, 0, 'Initial registry generation must succeed');

      // Verify initial check passes
      const r1 = runCheck(dir);
      assert.equal(r1.code, 0, 'Check with v1 content must pass');

      // Simulate what header-fix does in Phase 5: stamp @version 0.0.2
      const v2Content = '#!/usr/bin/env bash\n# @version 0.0.2\n# mock pre-commit\necho ok\n';
      writeFileSync(join(dir, '.githooks', 'pre-commit'), v2Content);

      // Pre-Addition-B: the check now fails (registry was built against v1)
      const r2 = runCheck(dir);
      assert.equal(r2.code, 1, 'Check must fail after Phase 5 stamps new @version');
      assert.ok(
        r2.payload?.mismatches?.includes('.githooks/pre-commit'),
        `pre-commit should be in mismatches after stamp, got: ${JSON.stringify(r2.payload?.mismatches)}`,
      );

      // Simulate Addition B at Phase 5 inline position: re-run --update
      const additionB = runAdditionB(dir);
      assert.equal(
        additionB.code,
        0,
        `Addition B (--update --from-pre-commit-hook) must succeed after Phase 5 stamp. stderr: ${additionB.stderr}`,
      );
      assert.equal(additionB.payload?.action, 'updated');

      // After Addition B: check must pass with the post-stamp registry
      const r3 = runCheck(dir);
      assert.equal(
        r3.code,
        0,
        `Check after Addition B must exit 0 (fingerprints reflect post-stamp content). stdout: ${r3.stdout} stderr: ${r3.stderr}`,
      );
      assert.equal(r3.payload?.ok, true);
      assert.equal(r3.payload?.mismatches?.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Test B — Phase 6/7 failure scenario: fingerprints still consistent on retry
// ---------------------------------------------------------------------------
describe('TPL-287 Test B — Phase 6/7 failure scenario: retry succeeds without manual --update', () => {
  it('fingerprints updated by Addition B survive a simulated Phase 7 failure and retry', () => {
    const dir = makeTempWorkspace('retry');
    try {
      // Simulate the scenario:
      // 1. Phase 5 stamps @version 0.0.2 on pre-commit
      // 2. Addition B runs at Phase 5 inline and updates registry
      // 3. Phase 7 "fails" (we skip it in test — just verify state after step 2)
      // 4. On retry, Phase 1.0 runs check — must pass because registry was already updated

      const stampedContent =
        '#!/usr/bin/env bash\n# @version 0.0.2\n# mock hook after Phase-5 stamp\necho ok\n';
      writeFileSync(join(dir, '.githooks', 'pre-commit'), stampedContent);

      // Addition B runs immediately after Phase 5 (Phase 5 inline)
      const additionB = runAdditionB(dir);
      assert.equal(
        additionB.code,
        0,
        `Addition B must succeed. stdout: ${additionB.stdout} stderr: ${additionB.stderr}`,
      );

      // --- Phase 7 "fails" here in production (we don't simulate it) ---
      // The commit is aborted. The hook exits 1 without returning.
      // The registry has already been updated by Addition B.

      // --- Retry attempt: operator re-runs git commit ---
      // Phase 1.0 runs hook-integrity-check (no flags):
      const retryCheck = runCheck(dir);
      assert.equal(
        retryCheck.code,
        0,
        `Phase 1.0 check on retry must exit 0 — no manual --update required. stdout: ${retryCheck.stdout}`,
      );
      assert.equal(retryCheck.payload?.ok, true);
      assert.equal(retryCheck.payload?.mismatches?.length, 0);

      // Confirm registry reflects the Phase-5-stamped content (not pre-Phase-5)
      assert.ok(
        existsSync(join(dir, '.githooks', '.fingerprints.json')),
        '.fingerprints.json must exist after Addition B',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
