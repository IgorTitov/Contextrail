/* @HEADER
 * @version 0.7.110 | 2026-05-06
 * @purpose Integration test for TPL-273: step 9c dirty-main fallback via update-ref + checkout HEAD.
 * @sidecar coa-merge-dirty-main.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-273 — Step 9c dirty-main fallback.
 *
 * Regression scenario: Cockpit sessions AIC-126/127/128/129 all hit
 * "Step 9c blocked by dirty/unstaged changes in main worktree" and were
 * forced to escape via manual `git update-ref` + `git checkout HEAD -- .`.
 *
 * Root cause: `git push --force-with-lease … receive.denyCurrentBranch=updateInstead`
 * refuses when the destination working tree has uncommitted changes overlapping
 * the pushed files. Header stamps and generated indexes accumulate in main
 * between ceremonies and trigger this refusal.
 *
 * Fix (TPL-273): when the push is refused due to a dirty main wt, coa-merge
 * falls back to `update-ref` (with optimistic locking on old SHA) +
 * `git checkout HEAD -- .` in main's wt. This matches the manual Sonnet escape
 * and intentionally discards uncommitted drift (operational dust in a non-bare
 * repo convention).
 *
 * Test shape:
 *   1. Fresh main repo with receive.denyCurrentBranch=updateInstead.
 *   2. Linked transport worktree on tx-TPL-273-test with feature.js staged for change.
 *   3. Main wt dirtied: feature.js modified (uncommitted) — simulates header-stamp drift.
 *   4. coa-merge ceremony runs from the transport worktree with --no-snapshot.
 *   5. Assert: exit 0, main HEAD = tx HEAD, main wt has feature.js = v2.
 *
 * Every git invocation in setup/assertions uses safeGitSpawn (R1 / ADR-0015).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

import { safeGitSpawn } from '../_setup/safe-git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COA_MERGE = resolve(__dirname, '../../scripts/coa-merge.mjs');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Create a main repo + linked transport worktree pair under baseDir:
 *   baseDir/main  — main branch, receive.denyCurrentBranch=updateInstead
 *   baseDir/tx    — linked worktree on tx-TPL-273-test
 *
 * The transport worktree has CHANGELOG.md + feature.js staged.
 * main's feature.js is dirtied to simulate header-stamp drift.
 * Returns { mainRoot, txRoot }.
 */
function createDirtyMainFixture(baseDir) {
  const mainRoot = join(baseDir, 'main');
  const txRoot = join(baseDir, 'tx');
  mkdirSync(mainRoot);

  // --- main repo ---
  safeGitSpawn(mainRoot, ['init', '-b', 'main']);
  safeGitSpawn(mainRoot, ['config', 'user.email', 'test@tpl273.local']);
  safeGitSpawn(mainRoot, ['config', 'user.name', 'TPL-273 Test']);
  safeGitSpawn(mainRoot, ['config', 'commit.gpgsign', 'false']);
  // Required for PUSH_UPDATE_INSTEAD path to be chosen by classifyFfUpdateMethod.
  safeGitSpawn(mainRoot, ['config', 'receive.denyCurrentBranch', 'updateInstead']);

  mkdirSync(join(mainRoot, '.claims'), { recursive: true });
  writeFileSync(join(mainRoot, 'VERSION'), '0.0.1\n');
  writeFileSync(join(mainRoot, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n\n- initial\n');
  writeFileSync(
    join(mainRoot, 'package.json'),
    JSON.stringify({ name: 'tpl273-fixture', version: '0.0.1' }, null, 2) + '\n',
  );
  writeFileSync(join(mainRoot, 'feature.js'), '// v1\n');
  safeGitSpawn(mainRoot, ['add', 'VERSION', 'CHANGELOG.md', 'package.json', 'feature.js']);
  safeGitSpawn(mainRoot, ['commit', '-m', 'init']);

  // --- transport worktree ---
  safeGitSpawn(mainRoot, ['worktree', 'add', '-b', 'tx-TPL-273-test', txRoot]);

  // .claims/ is not tracked by git so worktree add does not create it.
  mkdirSync(join(txRoot, '.claims'), { recursive: true });
  // TPL-304: step 0.5 requires a .coa-session in the tx-worktree.
  writeFileSync(
    join(txRoot, '.coa-session'),
    JSON.stringify({
      sessionName: 'tx-TPL-273-test',
      agent: 'test-tpl273-agent',
      created: new Date().toISOString(),
    }) + '\n',
  );

  // Populate [Unreleased] for coa-merge step 5 gate.
  writeFileSync(
    join(txRoot, 'CHANGELOG.md'),
    '# Changelog\n\n## [Unreleased]\n\n- dirty-main fallback (TPL-273)\n',
  );
  // Change feature.js — this is the file that will conflict with main's dirty
  // state and cause updateInstead to refuse the push.
  writeFileSync(join(txRoot, 'feature.js'), '// v2\n');
  safeGitSpawn(txRoot, ['add', 'CHANGELOG.md', 'feature.js']);

  // Create an active claim covering the staged files (required by step 3).
  // The claim must live in mainRoot/.claims/ — resolveMainRepoRoot() resolves
  // the linked tx-worktree to the main repo root (TPL-288).
  const now = new Date();
  const expires = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  writeFileSync(
    join(mainRoot, '.claims', 'clm-tpl273-test.json'),
    JSON.stringify(
      {
        id: 'clm-tpl273-test',
        agent: 'test-tpl273-agent',
        slice: 'TPL-273-test',
        targets: [
          { path: 'CHANGELOG.md', action: 'modify' },
          { path: 'feature.js', action: 'modify' },
        ],
        status: 'active',
        strategy: 'modify-in-place',
        created: now.toISOString(),
        expires: expires.toISOString(),
      },
      null,
      2,
    ) + '\n',
  );

  // Dirty main's feature.js — simulates header-stamp drift accumulated between
  // ceremonies. This is what triggers the updateInstead refusal.
  writeFileSync(join(mainRoot, 'feature.js'), '// v1 dirty (uncommitted)\n');

  return { mainRoot, txRoot };
}

/**
 * Strip GIT_DIR / GIT_WORK_TREE from subprocess env so coa-merge's internal
 * git invocations stay pinned to the fixture repo, not any parent checkout.
 */
function subprocessEnv() {
  const env = { ...process.env };
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  ]) {
    delete env[key];
  }
  env.GIT_CEILING_DIRECTORIES = realpathSync(tmpdir());
  env.GIT_CONFIG_NOSYSTEM = '1';
  // TPL-304: step 0.5 requires caller agent matching .coa-session.
  env.COA_AGENT = 'test-tpl273-agent';
  return env;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('coa-merge: step 9c dirty-main fallback (TPL-273)', () => {
  let baseDir;

  afterEach(() => {
    if (baseDir && existsSync(baseDir)) {
      try {
        rmSync(baseDir, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
      baseDir = undefined;
    }
  });

  test('step 9c succeeds via update-ref+checkout when main wt is dirty', () => {
    baseDir = mkdtempSync(join(tmpdir(), 'tpl273-basic-'));
    const { mainRoot, txRoot } = createDirtyMainFixture(baseDir);

    const result = spawnSync(
      process.execPath,
      [
        COA_MERGE,
        '--message=test(fixture): dirty-main fallback check (TPL-273-test)',
        '--no-snapshot',
      ],
      {
        cwd: txRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        env: subprocessEnv(),
      },
    );

    assert.strictEqual(
      result.status,
      0,
      `coa-merge failed (exit ${result.status}):\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );

    // main HEAD must equal the tx-branch HEAD after the ceremony.
    const txHead = safeGitSpawn(txRoot, ['rev-parse', 'HEAD']).stdout.trim();
    const mainHead = safeGitSpawn(mainRoot, ['rev-parse', 'HEAD']).stdout.trim();
    assert.strictEqual(
      mainHead,
      txHead,
      `main HEAD (${mainHead}) should equal tx HEAD (${txHead}) after step 9c dirty-wt fallback`,
    );

    // main wt should have feature.js = v2 (dirty drift discarded by checkout).
    const mainFeature = readFileSync(join(mainRoot, 'feature.js'), 'utf8');
    assert.strictEqual(
      mainFeature,
      '// v2\n',
      `main wt feature.js should be v2 after checkout HEAD -- (got: ${mainFeature.trim()})`,
    );

    // The fallback warning should appear in stderr output.
    const combined = result.stdout + result.stderr;
    assert.ok(
      combined.includes('falling back to update-ref + checkout HEAD'),
      `Expected dirty-wt fallback log in combined output:\n${combined}`,
    );
  });
});
