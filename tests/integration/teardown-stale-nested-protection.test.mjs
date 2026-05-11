/* @HEADER
 * @version 0.7.122 | 2026-05-06
 * @purpose Integration tests proving nested permanent-infrastructure worktrees (e.g. .cockpit-stable) are never eligible for --teardown-stale, including under --include-dirty (TPL-315 / ADR-0041).
 * @sidecar teardown-stale-nested-protection.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-315 — nested-worktree protection.
 *
 * Today's incident: aggregator's `--teardown-stale --dry-run --include-dirty`
 * listed `.cockpit-stable` (Cockpit's stable-build cache, nested at
 * `<target-repo>/.cockpit-stable`, detached HEAD at a stable SHA) under
 * "will delete with --execute". The conservative path classified it as
 * CLEAN_MERGED because its HEAD happens to be an ancestor of trunk.
 *
 * Fix: classifyVerdict now accepts isNestedInsideRepo + isKnownInfraWorktree.
 * Nested clean worktrees and known-infra basenames (any dirty state) collapse
 * to CLEAN_ACTIVE up front. Both isEligibleForTeardownStale and
 * isEligibleForTeardownStaleIncludingDirty correctly skip CLEAN_ACTIVE.
 *
 * Cases:
 *   1. .cockpit-stable nested + clean + detached HEAD on old SHA → CLEAN_ACTIVE,
 *      not eligible for --teardown-stale.
 *   2. Same fixture + --include-dirty flag → still CLEAN_ACTIVE, still skipped.
 *   3. Real (non-nested) tx-* merged worktree alongside the nested one →
 *      eligible per existing rules.
 *   4. Generic nested worktree with custom basename (.my-build-cache),
 *      clean → CLEAN_ACTIVE.
 *   5. Nested .cockpit-stable with dirty edits → still CLEAN_ACTIVE
 *      (known-infra wins over dirty); generic nested + dirty + unknown
 *      basename falls through to ordinary verdict logic.
 *
 * @see docs/adr/0041-nested-worktree-protection.md
 * @see docs/adr/0016-worktree-lifecycle.md
 */

import { describe, test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, writeFileSync, readFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { runTeardownStale } from '../../scripts/coa-worktree.mjs';
import {
  VERDICTS,
  classifyVerdict,
  isPathNestedInsideRepo,
  isKnownInfraWorktree,
} from '../../scripts/lib/worktree-audit.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl315-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl315.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL315 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return root;
}

/**
 * Add a worktree at `<root>/<name>` — i.e. nested INSIDE the repo root.
 * Mimics Cockpit's `.cockpit-stable` placement.
 */
function addNestedWorktree(root, name, branchName) {
  const wtPath = join(root, name);
  rmSync(wtPath, { recursive: true, force: true });
  const branch = branchName || `feat/${name}`;
  safeGitSpawn(root, ['worktree', 'add', '-b', branch, wtPath, 'main']);
  return { path: wtPath, branch };
}

/** Add a worktree OUTSIDE the repo root (under tmpdir), as ceremony tx-* normally would. */
function addExternalWorktree(root, name, branchName) {
  const wtPath = mkdtempSync(join(tmpdir(), `tpl315-wt-${name}-`));
  rmSync(wtPath, { recursive: true, force: true });
  const branch = branchName || `feat/${name}`;
  safeGitSpawn(root, ['worktree', 'add', '-b', branch, wtPath, 'main']);
  return { path: wtPath, branch };
}

function commitInWorktree(wtPath, filename, content) {
  writeFileSync(join(wtPath, filename), content);
  safeGitSpawn(wtPath, ['add', filename]);
  safeGitSpawn(wtPath, ['commit', '-m', `add ${filename}`]);
}

function mergeBranchIntoMain(root, branch) {
  safeGitSpawn(root, ['checkout', 'main']);
  safeGitSpawn(root, ['merge', '--no-ff', '--no-edit', branch]);
}

/** Detach HEAD inside the worktree to mimic Cockpit's stable-SHA pin. */
function detachHead(wtPath) {
  const probe = safeGitSpawn(wtPath, ['rev-parse', 'HEAD']);
  const sha = probe.stdout.trim();
  safeGitSpawn(wtPath, ['checkout', '--detach', sha]);
}

// ---------------------------------------------------------------------------
// Pure helper assertions — establish that the new exports behave correctly
// independent of the audit pipeline, so a regression in helpers fails fast.
// ---------------------------------------------------------------------------

describe('TPL-315 helpers — isPathNestedInsideRepo / isKnownInfraWorktree', () => {
  test('isPathNestedInsideRepo: child path is nested', () => {
    assert.equal(isPathNestedInsideRepo('/repo/.cockpit-stable', '/repo'), true);
    assert.equal(isPathNestedInsideRepo('C:\\repo\\.cockpit-stable', 'C:\\repo'), true);
  });

  test('isPathNestedInsideRepo: repo root itself is NOT nested', () => {
    assert.equal(isPathNestedInsideRepo('/repo', '/repo'), false);
  });

  test('isPathNestedInsideRepo: sibling path is NOT nested', () => {
    assert.equal(isPathNestedInsideRepo('/other-repo', '/repo'), false);
    assert.equal(isPathNestedInsideRepo('/repo-tx-X', '/repo'), false);
  });

  test('isKnownInfraWorktree: .cockpit-stable basename matches', () => {
    assert.equal(isKnownInfraWorktree('/anywhere/.cockpit-stable'), true);
    assert.equal(isKnownInfraWorktree('C:\\Projects\\zvenix\\.cockpit-stable'), true);
  });

  test('isKnownInfraWorktree: unknown basename does not match', () => {
    assert.equal(isKnownInfraWorktree('/repo/.my-build-cache'), false);
    assert.equal(isKnownInfraWorktree('/repo/tx-TPL-315'), false);
  });
});

describe('TPL-315 classifier — nested-protection branches', () => {
  test('known-infra + nested wins over dirty', () => {
    const v = classifyVerdict({
      isNestedInsideRepo: true,
      isKnownInfraWorktree: true,
      dirtyCount: 5,
      logicChangedCount: 5,
      isMerged: true,
    });
    assert.equal(v, VERDICTS.CLEAN_ACTIVE);
  });

  test('generic nested + clean → CLEAN_ACTIVE', () => {
    const v = classifyVerdict({
      isNestedInsideRepo: true,
      isKnownInfraWorktree: false,
      dirtyCount: 0,
      isMerged: true,
    });
    assert.equal(v, VERDICTS.CLEAN_ACTIVE);
  });

  test('generic nested + dirty + unknown basename falls through to normal logic', () => {
    const v = classifyVerdict({
      isNestedInsideRepo: true,
      isKnownInfraWorktree: false,
      dirtyCount: 3,
      logicChangedCount: 3,
      isMerged: true,
    });
    assert.equal(v, VERDICTS.STALE_MERGED_WITH_WIP);
  });

  test('mergeInProgress still wins over nested-protection', () => {
    const v = classifyVerdict({
      isNestedInsideRepo: true,
      isKnownInfraWorktree: true,
      mergeInProgress: true,
    });
    assert.equal(v, VERDICTS.MERGE_IN_PROGRESS);
  });

  test('not nested → behaves as before (CLEAN_MERGED)', () => {
    const v = classifyVerdict({
      isNestedInsideRepo: false,
      isMerged: true,
      dirtyCount: 0,
    });
    assert.equal(v, VERDICTS.CLEAN_MERGED);
  });
});

// ---------------------------------------------------------------------------
// End-to-end fixture cases
// ---------------------------------------------------------------------------

describe('TPL-315 — nested .cockpit-stable never eligible for teardown-stale', () => {
  let root;

  beforeEach(() => {
    root = createBaseRepo('cockpit-stable');
  });

  after(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  test('Case 1: nested .cockpit-stable, clean, detached HEAD → CLEAN_ACTIVE, not eligible', () => {
    const { path: wtPath } = addNestedWorktree(root, '.cockpit-stable', 'cockpit-stable-branch');
    detachHead(wtPath);

    const { result, exitCode } = runTeardownStale(root, { silent: true });
    assert.equal(exitCode, 0);
    assert.equal(result.eligible.length, 0, 'nested infra must not be eligible');
    const skipped = result.ineligible.find((i) => basename(i.path) === '.cockpit-stable');
    assert.ok(skipped, '.cockpit-stable must appear under ineligible');
    assert.equal(skipped.reason, VERDICTS.CLEAN_ACTIVE);
  });

  test('Case 2: --include-dirty does NOT widen to CLEAN_ACTIVE', () => {
    const { path: wtPath } = addNestedWorktree(root, '.cockpit-stable', 'cockpit-stable-branch-2');
    detachHead(wtPath);
    // Add some dirt — known-infra rule should still pin to CLEAN_ACTIVE.
    writeFileSync(join(wtPath, 'rebuild-artifact.bin'), 'partial build cache\n');

    const { result, exitCode } = runTeardownStale(root, {
      includeDirty: true,
      silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(
      result.eligible.length, 0,
      '.cockpit-stable must remain ineligible even with --include-dirty',
    );
    const skipped = result.ineligible.find((i) => basename(i.path) === '.cockpit-stable');
    assert.ok(skipped);
    assert.equal(skipped.reason, VERDICTS.CLEAN_ACTIVE);
  });

  test('Case 3: external tx-* merged worktree is still eligible alongside protected nested infra', () => {
    // Protected nested infra:
    const { path: wtNested } = addNestedWorktree(root, '.cockpit-stable', 'cockpit-stable-branch-3');
    detachHead(wtNested);

    // Real ceremony tx-*:
    const { path: wtTx, branch: txBranch } = addExternalWorktree(root, 'tx', 'tx-TPL-315-fixture');
    commitInWorktree(wtTx, 'feature.mjs', 'export const x = 1;\n');
    mergeBranchIntoMain(root, txBranch);

    const { result, exitCode } = runTeardownStale(root, { silent: true });
    assert.equal(exitCode, 0);
    assert.equal(result.eligible.length, 1, 'only the tx-* worktree should be eligible');
    assert.equal(basename(result.eligible[0].path), basename(wtTx));
    const skipped = result.ineligible.find((i) => basename(i.path) === '.cockpit-stable');
    assert.ok(skipped, 'nested infra must still be skipped');
    assert.equal(skipped.reason, VERDICTS.CLEAN_ACTIVE);
  });

  test('Case 4: custom-named nested worktree (.my-build-cache), clean → CLEAN_ACTIVE via generic rule', () => {
    const { path: wtPath } = addNestedWorktree(root, '.my-build-cache', 'custom-cache-branch');
    detachHead(wtPath);

    const { result, exitCode } = runTeardownStale(root, { silent: true });
    assert.equal(exitCode, 0);
    assert.equal(result.eligible.length, 0);
    const skipped = result.ineligible.find((i) => basename(i.path) === '.my-build-cache');
    assert.ok(skipped);
    assert.equal(skipped.reason, VERDICTS.CLEAN_ACTIVE);
  });

  test('Case 5: nested .cockpit-stable with logic-dirt → still CLEAN_ACTIVE (known-infra override)', () => {
    const { path: wtPath } = addNestedWorktree(root, '.cockpit-stable', 'cockpit-stable-branch-5');
    detachHead(wtPath);
    // Logic-edit on a tracked file — would normally flip to STALE_MERGED_WITH_WIP.
    writeFileSync(join(wtPath, 'README.md'), '# rebuilt\n// extra body line\n');

    const { result, exitCode } = runTeardownStale(root, {
      includeDirty: true,
      silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.eligible.length, 0);
    const skipped = result.ineligible.find((i) => basename(i.path) === '.cockpit-stable');
    assert.ok(skipped);
    assert.equal(skipped.reason, VERDICTS.CLEAN_ACTIVE);
  });
});
