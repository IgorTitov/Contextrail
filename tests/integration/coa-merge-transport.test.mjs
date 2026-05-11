/* @HEADER
 * @version 0.7.73 | 2026-05-04
 * @purpose Integration tests for TPL-265: Step 9c config capture/rollback with real git fixtures.
 * @sidecar coa-merge-transport.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-265 — Step 9c PUSH_UPDATE_INSTEAD config capture/rollback integration tests.
 *
 * These tests exercise the three helpers exported from coa-merge.mjs against
 * real git fixtures (actual repos in tmpdir) to verify:
 *   1. validatePushUpdateInsteadWorktree rejects non-transport branches.
 *   2. captureGitConfig + restoreGitConfig round-trip correctly against a real
 *      `.git/config` that includes receive.denyCurrentBranch=updateInstead.
 *
 * The tests do NOT run coa-merge end-to-end (covered by autostash and
 * transport-branch-flow tests). They focus on the helper layer that
 * Step 9c calls. This is sufficient to prove rollback behaviour because
 * Step 9c calls the helpers directly — if the helpers work with real git
 * fixtures, the integration concern is covered.
 *
 * Every git invocation uses safeGitSpawn (R1 / ADR-0015).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  captureGitConfig,
  restoreGitConfig,
  validatePushUpdateInsteadWorktree,
} from '../../scripts/coa-merge.mjs';

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

/**
 * Create a minimal git repo in tmpdir with one commit on main.
 * Returns the repo root path.
 */
function createMainFixture(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl265-integ-${label}-`));

  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl265.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL-265 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init: fixture for TPL-265 tests']);

  return root;
}

// ---------------------------------------------------------------------------
// Scenario 1: wrong-worktree validation rejects
// ---------------------------------------------------------------------------

describe('TPL-265 integration: validatePushUpdateInsteadWorktree rejects wrong context', () => {
  test('rejects trunk "main" — simulates running from wrong worktree', () => {
    // When coa-merge is invoked from a context where the current branch is
    // main (not a tx-* transport branch), the validator should throw.
    assert.throws(
      () => validatePushUpdateInsteadWorktree('main'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('tx-* transport worktree'));
        assert.ok(err.message.includes("'main'"));
        return true;
      },
      'must throw for main branch',
    );
  });

  test('accepts tx-TPL-265 — simulates correct transport worktree', () => {
    assert.doesNotThrow(
      () => validatePushUpdateInsteadWorktree('tx-TPL-265'),
      'must NOT throw for a valid transport branch',
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: config rollback fires on failed push (helper-layer proof)
// ---------------------------------------------------------------------------

describe('TPL-265 integration: captureGitConfig + restoreGitConfig with real git fixture', () => {
  let mainRepo = null;

  afterEach(() => {
    if (mainRepo) {
      try { rmSync(mainRepo, { recursive: true, force: true }); } catch { /* best effort */ }
      mainRepo = null;
    }
  });

  test('config round-trip: main repo with receive.denyCurrentBranch=updateInstead', () => {
    mainRepo = createMainFixture('roundtrip');

    // Simulate the operator having set receive.denyCurrentBranch=updateInstead
    // in the main repo (required for PUSH_UPDATE_INSTEAD to be chosen by
    // classifyFfUpdateMethod). We set it here via git config to replicate the
    // real scenario.
    safeGitSpawn(mainRepo, ['config', 'receive.denyCurrentBranch', 'updateInstead']);

    // Capture the config (Step 9c does this before the push).
    const captured = captureGitConfig(mainRepo);
    assert.ok(captured.includes('denyCurrentBranch = updateInstead'), 'captured config should include the key');

    // Simulate a mutation that could happen if Step 9c code set additional
    // keys (mirrors the Cockpit AIC-116 corruption scenario).
    const configPath = join(mainRepo, '.git', 'config');
    const corrupt = captured +
      '\n[corruption-marker]\n\tbare = true\n\tmalicious-remote = http://bad.example\n';
    writeFileSync(configPath, corrupt, 'utf8');

    const afterMutation = readFileSync(configPath, 'utf8');
    assert.ok(afterMutation.includes('corruption-marker'), 'config should show mutation before restore');

    // Rollback (Step 9c calls this when push.ok === false).
    restoreGitConfig(mainRepo, captured);

    const afterRestore = readFileSync(configPath, 'utf8');
    assert.equal(afterRestore, captured, 'restored content must equal pre-mutation snapshot');
    assert.ok(!afterRestore.includes('corruption-marker'), 'corruption-marker must be gone after restore');
    assert.ok(!afterRestore.includes('bare = true'), 'bare=true must be gone after restore');
    assert.ok(afterRestore.includes('denyCurrentBranch = updateInstead'), 'legitimate config key must survive restore');
  });

  test('capture → mutate → restore is idempotent (multiple restores leave config stable)', () => {
    mainRepo = createMainFixture('idempotent');
    safeGitSpawn(mainRepo, ['config', 'receive.denyCurrentBranch', 'updateInstead']);

    const captured = captureGitConfig(mainRepo);

    // Mutate once
    const configPath = join(mainRepo, '.git', 'config');
    writeFileSync(configPath, captured + '\n[extra]\n\tkey = val\n', 'utf8');
    restoreGitConfig(mainRepo, captured);

    // Mutate again
    writeFileSync(configPath, captured + '\n[extra2]\n\tkey2 = val2\n', 'utf8');
    restoreGitConfig(mainRepo, captured);

    const afterSecondRestore = readFileSync(configPath, 'utf8');
    assert.equal(afterSecondRestore, captured, 'second restore should also match original captured content');
  });
});
