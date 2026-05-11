/* @HEADER
 * @version 0.7.110 | 2026-05-06
 * @purpose Integration tests for coa-merge step 9e auto-teardown + step 9f claim auto-expire (TPL-283).
 * @sidecar coa-merge-auto-teardown.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-283 — Integration tests: coa-merge step 9e auto-teardown + step 9f.
 *
 * Tests the five spec scenarios:
 *   1. tx-FXT-001 and tx-FXT-002 both ff-merged into main; coa-merge in
 *      tx-FXT-003 tears down both; tx-FXT-003 (current) is preserved.
 *   2. tx-FXT-004 NOT ancestor of main (separate work); preserved.
 *   3. tx-FXT-006 ancestor + no worktree; branch deleted cleanly.
 *      (Covered within Scenario 1 setup where branches have no worktrees.)
 *   4. tx-FXT-006 ancestor + worktree exists + dirty; warning, both preserved.
 *   5. Stale claim auto-expired after step 9e.
 *
 * Branch names must match tx-([A-Z][A-Z0-9]*)-(\d+)(-[a-z][a-z0-9]*)?
 * Using FXT (Fixture) prefix with 3-digit IDs.
 *
 * All git invocations use safeGitSpawn (R1 / ADR-0015).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { findWorktreeForBranch, classifyTxBranchesForTeardown } from '../../scripts/coa-merge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COA_MERGE = resolve(__dirname, '../../scripts/coa-merge.mjs');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createBaseFixture(label) {
  const root = mkdtempSync(join(tmpdir(), `coa-teardown-${label}-`));

  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl283.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL-283 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(join(root, 'VERSION'), '0.0.1\n');
  writeFileSync(
    join(root, 'CHANGELOG.md'),
    '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- initial\n',
  );
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'teardown-fixture', version: '0.0.1' }, null, 2) + '\n',
  );
  // TPL-304: step 0.5 requires a .coa-session file identifying the session owner.
  writeFileSync(
    join(root, '.coa-session'),
    JSON.stringify({ sessionName: 'tx-FXT-test', agent: 'test-agent-teardown', created: new Date().toISOString() }) + '\n',
  );
  safeGitSpawn(root, ['add', 'VERSION', 'CHANGELOG.md', 'package.json', '.claims']);
  safeGitSpawn(root, ['commit', '-m', 'init']);

  return root;
}

function createActiveClaim(root, claimId, agent, targets) {
  const now = new Date();
  const expires = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  writeFileSync(
    join(root, '.claims', `${claimId}.json`),
    JSON.stringify({
      id: claimId,
      agent,
      slice: 'FXT-test',
      targets: targets.map((path) => ({ path, action: 'modify' })),
      status: 'active',
      strategy: 'modify-in-place',
      created: now.toISOString(),
      expires: expires.toISOString(),
    }, null, 2) + '\n',
  );
}

function createStaleClaim(root, claimId, agent) {
  const now = new Date();
  const expired = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  writeFileSync(
    join(root, '.claims', `${claimId}.json`),
    JSON.stringify({
      id: claimId,
      agent,
      slice: 'FXT-stale',
      targets: [{ path: 'some/old/file.mjs', action: 'modify' }],
      status: 'active',
      strategy: 'modify-in-place',
      created: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      expires: expired.toISOString(),
    }, null, 2) + '\n',
  );
}

function subprocessEnv(fixtureRoot) {
  const env = { ...process.env };
  for (const key of [
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_COMMON_DIR',
  ]) {
    delete env[key];
  }
  env.GIT_CEILING_DIRECTORIES = realpathSync(tmpdir());
  env.GIT_CONFIG_NOSYSTEM = '1';
  // TPL-304: step 0.5 requires a caller agent identity matching .coa-session.
  env.COA_AGENT = 'test-agent-teardown';
  return env;
}

function runCoaMerge(root, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [COA_MERGE, '--no-snapshot', ...extraArgs],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
      env: subprocessEnv(root),
    },
  );
}

function listBranches(root) {
  const r = safeGitSpawn(root, ['branch', '--format=%(refname:short)']);
  return r.stdout.trim().split('\n').filter(Boolean);
}

// ---------------------------------------------------------------------------
// Pure-helper unit tests (no subprocess, fast)
// ---------------------------------------------------------------------------

describe('classifyTxBranchesForTeardown: pure-helper', () => {
  test('correctly splits merged vs unmerged, excludes current branch', () => {
    const ancestorSet = new Set(['tx-FXT-001', 'tx-FXT-002']);
    const { merged, unmerged } = classifyTxBranchesForTeardown({
      allTxBranches: ['tx-FXT-001', 'tx-FXT-002', 'tx-FXT-003', 'tx-FXT-004'],
      currentBranch: 'tx-FXT-003',
      isAncestorOfMain: (b) => ancestorSet.has(b),
    });
    assert.deepEqual(merged, ['tx-FXT-001', 'tx-FXT-002']);
    assert.deepEqual(unmerged, ['tx-FXT-004']);
  });

  test('empty branch list produces empty arrays', () => {
    const { merged, unmerged } = classifyTxBranchesForTeardown({
      allTxBranches: [],
      currentBranch: 'tx-FXT-003',
      isAncestorOfMain: () => true,
    });
    assert.deepEqual(merged, []);
    assert.deepEqual(unmerged, []);
  });

  test('all branches unmerged: merged is empty', () => {
    const { merged, unmerged } = classifyTxBranchesForTeardown({
      allTxBranches: ['tx-FXT-001', 'tx-FXT-002'],
      currentBranch: 'tx-FXT-999',
      isAncestorOfMain: () => false,
    });
    assert.deepEqual(merged, []);
    assert.deepEqual(unmerged, ['tx-FXT-001', 'tx-FXT-002']);
  });
});

describe('findWorktreeForBranch: pure-helper', () => {
  test('finds worktree path for a given branch', () => {
    const porcelain = [
      'worktree /repos/main',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /tmp/coa-tx-A',
      'HEAD def456',
      'branch refs/heads/tx-FXT-001',
      '',
    ].join('\n');
    assert.equal(findWorktreeForBranch(porcelain, 'tx-FXT-001'), '/tmp/coa-tx-A');
    assert.equal(findWorktreeForBranch(porcelain, 'main'), '/repos/main');
    assert.equal(findWorktreeForBranch(porcelain, 'tx-FXT-999'), null);
  });

  test('returns null for empty input', () => {
    assert.equal(findWorktreeForBranch('', 'tx-FXT-001'), null);
    assert.equal(findWorktreeForBranch(null, 'tx-FXT-001'), null);
  });
});

// ---------------------------------------------------------------------------
// Integration scenarios (subprocess, real git fixtures)
// ---------------------------------------------------------------------------

describe('coa-merge step 9e: auto-teardown merged tx- branches', () => {
  let fixtureRoot;

  afterEach(() => {
    if (fixtureRoot && existsSync(fixtureRoot)) {
      try { rmSync(fixtureRoot, { recursive: true, force: true }); } catch { /* best effort */ }
      fixtureRoot = undefined;
    }
  });

  // -------------------------------------------------------------------------
  // Scenario 1: two merged tx- branches torn down; current branch preserved
  // tx-FXT-001 and tx-FXT-002 are at C0 (ancestor of main from the start).
  // coa-merge runs from tx-FXT-003 and tears down 001+002 but not 003.
  // -------------------------------------------------------------------------
  test('Scenario 1: two merged branches torn down; current preserved', () => {
    fixtureRoot = createBaseFixture('s1');

    // Create two stale branches at C0 (C0 is already an ancestor of main).
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-001']);
    safeGitSpawn(fixtureRoot, ['checkout', 'main']);
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-002']);
    safeGitSpawn(fixtureRoot, ['checkout', 'main']);

    // Active work branch.
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-003']);

    writeFileSync(
      join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- auto-teardown (TPL-283)\n',
    );
    writeFileSync(join(fixtureRoot, 'feature.mjs'), 'export const x = 1;\n');
    safeGitSpawn(fixtureRoot, ['add', 'CHANGELOG.md', 'feature.mjs']);

    createActiveClaim(fixtureRoot, 'clm-s1-test', 'test-agent-s1', ['CHANGELOG.md', 'feature.mjs']);

    const result = runCoaMerge(fixtureRoot, [
      '--message=test(teardown): scenario 1 two merged tx- branches (TPL-283)',
    ]);

    assert.strictEqual(result.status, 0,
      `coa-merge failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

    const branches = listBranches(fixtureRoot);
    assert.ok(
      !branches.includes('tx-FXT-001'),
      `tx-FXT-001 should have been torn down; branches: ${branches.join(', ')}`,
    );
    assert.ok(
      !branches.includes('tx-FXT-002'),
      `tx-FXT-002 should have been torn down; branches: ${branches.join(', ')}`,
    );
    assert.ok(
      branches.includes('tx-FXT-003'),
      `tx-FXT-003 (current) must survive; branches: ${branches.join(', ')}`,
    );
    assert.ok(
      result.stdout.includes('[9e]') && result.stdout.includes('auto-teardown'),
      `Expected [9e] auto-teardown in stdout:\n${result.stdout}`,
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 2: unmerged tx- branch preserved
  // tx-FXT-004 has commits NOT in main — must be preserved.
  // -------------------------------------------------------------------------
  test('Scenario 2: unmerged tx- branch with separate work is preserved', () => {
    fixtureRoot = createBaseFixture('s2');

    // tx-FXT-004: from main, add a diverging commit NOT in main's history.
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-004']);
    writeFileSync(join(fixtureRoot, 'diverge.mjs'), 'export const d = true;\n');
    safeGitSpawn(fixtureRoot, ['add', 'diverge.mjs']);
    safeGitSpawn(fixtureRoot, ['commit', '-m', 'wip: diverging work (TPL-283)']);

    // Active work branch.
    safeGitSpawn(fixtureRoot, ['checkout', 'main']);
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-005']);

    writeFileSync(
      join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- scenario 2 (TPL-283)\n',
    );
    writeFileSync(join(fixtureRoot, 'feature2.mjs'), 'export const y = 2;\n');
    safeGitSpawn(fixtureRoot, ['add', 'CHANGELOG.md', 'feature2.mjs']);

    createActiveClaim(fixtureRoot, 'clm-s2-test', 'test-agent-s2', ['CHANGELOG.md', 'feature2.mjs']);

    const result = runCoaMerge(fixtureRoot, [
      '--message=test(teardown): scenario 2 unmerged branch preserved (TPL-283)',
    ]);

    assert.strictEqual(result.status, 0,
      `coa-merge failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

    const branches = listBranches(fixtureRoot);
    assert.ok(
      branches.includes('tx-FXT-004'),
      `tx-FXT-004 (unmerged) must be preserved; branches: ${branches.join(', ')}`,
    );
    assert.ok(
      result.stdout.includes('[9e]') && result.stdout.includes('skipped'),
      `Expected [9e] skipped message in stdout:\n${result.stdout}`,
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 4: dirty worktree for merged branch - branch and dir preserved
  // tx-FXT-006 is at C0 (ancestor) with a linked worktree that has staged changes.
  // git worktree remove must fail due to dirty state; branch must survive.
  // -------------------------------------------------------------------------
  test('Scenario 4: dirty worktree for merged branch — branch and dir preserved', () => {
    fixtureRoot = createBaseFixture('s4');

    // tx-FXT-006: at C0 (ancestor of main).
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-006']);
    safeGitSpawn(fixtureRoot, ['checkout', 'main']);

    // Create a linked worktree for tx-FXT-006 in tmpdir.
    const wtPath = mkdtempSync(join(tmpdir(), 'coa-teardown-s4-wt-'));
    safeGitSpawn(fixtureRoot, ['worktree', 'add', wtPath, 'tx-FXT-006']);

    // Make the worktree dirty by staging a new file.
    writeFileSync(join(wtPath, 'staged-work.mjs'), 'export const dirty = true;\n');
    safeGitSpawn(wtPath, ['add', 'staged-work.mjs']);

    // Active work branch.
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-007']);
    writeFileSync(
      join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- scenario 4 (TPL-283)\n',
    );
    writeFileSync(join(fixtureRoot, 'feature4.mjs'), 'export const z = 4;\n');
    safeGitSpawn(fixtureRoot, ['add', 'CHANGELOG.md', 'feature4.mjs']);

    createActiveClaim(fixtureRoot, 'clm-s4-test', 'test-agent-s4', ['CHANGELOG.md', 'feature4.mjs']);

    const result = runCoaMerge(fixtureRoot, [
      '--message=test(teardown): scenario 4 dirty worktree preserved (TPL-283)',
    ]);

    assert.strictEqual(result.status, 0,
      `coa-merge failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

    // Branch and worktree must still exist (dirty work not destroyed).
    const branches = listBranches(fixtureRoot);
    assert.ok(
      branches.includes('tx-FXT-006'),
      `Dirty-worktree branch tx-FXT-006 must be preserved; branches: ${branches.join(', ')}`,
    );
    assert.ok(existsSync(wtPath), `Worktree dir must still exist when dirty: ${wtPath}`);

    // Cleanup leftover worktree (best-effort).
    try { safeGitSpawn(fixtureRoot, ['worktree', 'remove', '--force', wtPath]); } catch { /* ok */ }
    try { rmSync(wtPath, { recursive: true, force: true }); } catch { /* ok */ }
  });

  // -------------------------------------------------------------------------
  // Scenario 5: stale claim is auto-expired after step 9e (step 9f)
  // -------------------------------------------------------------------------
  test('Scenario 5: stale claim is auto-expired after step 9e', () => {
    fixtureRoot = createBaseFixture('s5');

    // Place an already-expired claim in .claims/ before the ceremony.
    createStaleClaim(fixtureRoot, 'clm-s5-stale', 'stale-agent');

    // Active work branch.
    safeGitSpawn(fixtureRoot, ['checkout', '-b', 'tx-FXT-008']);
    writeFileSync(
      join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- scenario 5 (TPL-283)\n',
    );
    writeFileSync(join(fixtureRoot, 'feature5.mjs'), 'export const q = 5;\n');
    safeGitSpawn(fixtureRoot, ['add', 'CHANGELOG.md', 'feature5.mjs']);

    createActiveClaim(fixtureRoot, 'clm-s5-active', 'test-agent-s5', ['CHANGELOG.md', 'feature5.mjs']);

    const result = runCoaMerge(fixtureRoot, [
      '--message=test(teardown): scenario 5 stale claim auto-expired (TPL-283)',
    ]);

    assert.strictEqual(result.status, 0,
      `coa-merge failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

    // Stale claim file must still exist (audit trail preserved).
    const staleClaimPath = join(fixtureRoot, '.claims', 'clm-s5-stale.json');
    assert.ok(existsSync(staleClaimPath), 'Stale claim file must still exist (audit trail)');

    // Status must be 'expired'.
    const staleClaim = JSON.parse(readFileSync(staleClaimPath, 'utf8'));
    assert.strictEqual(
      staleClaim.status,
      'expired',
      `Stale claim status must be 'expired'; got: ${staleClaim.status}`,
    );
  });
});
