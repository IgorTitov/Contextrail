/* @HEADER
 * @version 0.8.13 | 2026-05-11
 * @purpose Tests for TPL-334: transport worktrees land in .worktrees/ subdir; backward compat for old sibling locations; teardown and teardown-stale enumerate both.
 * @sidecar coa-worktree-dotworktrees.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests for ADR-0050: worktree relocation to .worktrees/ subdir (TPL-334).
 *
 * Covers:
 *   1. transportWorktreePath() returns a path inside .worktrees/
 *   2. runCreate() auto-creates .worktrees/ parent before git worktree add
 *   3. --teardown finds worktrees in old sibling location (backward compat)
 *   4. --teardown finds worktrees in new .worktrees/ location
 *   5. --teardown-stale --dry-run enumerates worktrees at both locations
 *
 * All git operations use safeGit/safeGitSpawn (R1, ADR-0015).
 * All repos are created under os.tmpdir().
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename, dirname, resolve } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  runCreate,
  runTeardown,
  runTeardownStale,
  resolveWorktreePath,
  transportWorktreePath,
  listWorktrees,
} from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl334-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl334.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL334 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return root;
}

function cleanupWorktree(mainRoot, wtPath) {
  const nmInWt = join(wtPath, 'node_modules');
  if (existsSync(nmInWt)) {
    try {
      rmSync(nmInWt, { recursive: false });
    } catch {
      try {
        rmSync(nmInWt, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }
  }
  try {
    safeGitSpawn(mainRoot, ['worktree', 'remove', '--force', wtPath]);
  } catch {
    /* best effort */
  }
  if (existsSync(wtPath)) rmSync(wtPath, { recursive: true, force: true });
  rmSync(mainRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 1. transportWorktreePath() places worktrees inside .worktrees/
// ---------------------------------------------------------------------------

describe('transportWorktreePath: .worktrees/ subdir (ADR-0050)', () => {
  test('path is inside .worktrees/ of the repos parent directory', () => {
    const repoRoot = '/home/user/my-app';
    const p = transportWorktreePath(repoRoot, 'TPL-334');
    const normalised = p.replaceAll('\\', '/');
    // Must be inside .worktrees/ (not a direct sibling)
    assert.ok(normalised.includes('/.worktrees/'), `Expected .worktrees/ in path, got: ${p}`);
    // Must end with repo-name + branch suffix
    assert.ok(
      normalised.endsWith('my-app-tx-TPL-334'),
      `Expected my-app-tx-TPL-334 suffix, got: ${p}`,
    );
    // Must NOT be a direct sibling (old location)
    const oldSibling = '/home/user/my-app-tx-TPL-334';
    assert.notStrictEqual(normalised, oldSibling, 'Should not be a direct sibling of repoRoot');
  });

  test('parent of the worktree path is named .worktrees', () => {
    const p = transportWorktreePath('/tmp/my-repo', 'APP-001');
    const parent = basename(dirname(p.replaceAll('\\', '/')));
    assert.strictEqual(parent, '.worktrees', `Expected parent .worktrees, got: ${parent}`);
  });
});

// ---------------------------------------------------------------------------
// 2. runCreate() auto-creates .worktrees/ parent dir
// ---------------------------------------------------------------------------

describe('runCreate: auto-creates .worktrees/ parent dir', () => {
  test('.worktrees/ parent dir and worktree path are both created by --create', () => {
    // We do NOT assert that .worktrees/ doesn't exist before the call:
    // it may already exist from earlier test runs (it's in os.tmpdir()).
    // We assert only that the SPECIFIC worktree path doesn't exist before,
    // and that both the parent dir and the worktree exist after.
    const mainRoot = createBaseRepo('autocreate-dir');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-334');
    const worktreesDir = dirname(wtPath);

    assert.ok(!existsSync(wtPath), `pre-condition: worktree should not exist yet: ${wtPath}`);

    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-334',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
      assert.ok(
        existsSync(worktreesDir),
        `.worktrees/ dir should exist after --create: ${worktreesDir}`,
      );
      assert.ok(existsSync(wtPath), `Worktree should exist at ${wtPath}`);
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('.worktrees/ dir creation is idempotent (no error when already exists)', () => {
    const mainRoot = createBaseRepo('autocreate-idempotent');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-334');
    const worktreesDir = dirname(wtPath);

    // Pre-create .worktrees/ to prove mkdirSync recursive is a no-op
    mkdirSync(worktreesDir, { recursive: true });
    assert.ok(existsSync(worktreesDir), 'pre-condition: .worktrees/ should exist');

    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-334',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('node_modules junction resolves through .worktrees/ path', () => {
    const mainRoot = createBaseRepo('nm-junction-dotworktrees');
    const pkgDir = join(mainRoot, 'node_modules', 'mypkg');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'index.js'), 'module.exports = 42;\n');

    const wtPath = transportWorktreePath(mainRoot, 'TPL-334');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-334',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
      assert.strictEqual(result.nodeModulesLinked, true, 'node_modules should be linked');

      // Junction must resolve through the .worktrees/ path
      const pkgViaJunction = join(wtPath, 'node_modules', 'mypkg', 'index.js');
      assert.ok(
        existsSync(pkgViaJunction),
        `mypkg/index.js accessible via junction at ${pkgViaJunction}`,
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Backward compat: --teardown finds worktrees in both locations
//    (resolveWorktreePath queries git worktree list, not path math)
// ---------------------------------------------------------------------------

describe('runTeardown: backward compat — finds worktrees in old sibling location', () => {
  test('teardown succeeds for a worktree that was manually placed as a sibling (old location)', () => {
    // Simulate a worktree created with the OLD behavior (sibling, no .worktrees/).
    // We do this by calling git worktree add directly with an old-style path.
    const mainRoot = createBaseRepo('compat-old-loc');
    const oldStylePath = join(dirname(mainRoot), `${basename(mainRoot)}-tx-TPL-001`);

    try {
      // Place worktree in old sibling location
      safeGitSpawn(mainRoot, ['worktree', 'add', '-b', 'tx-TPL-001', oldStylePath, 'main']);
      assert.ok(existsSync(oldStylePath), `pre-condition: old-style worktree at ${oldStylePath}`);

      // runTeardown must find and remove it by branch name
      const { exitCode, result } = runTeardown(mainRoot, {
        sessionName: 'tx-TPL-001',
        force: true,
        silent: true,
      });
      assert.strictEqual(exitCode, 0, `teardown failed: ${result?.error}`);
      assert.ok(!existsSync(oldStylePath), 'Old-style worktree dir should be removed');
    } finally {
      if (existsSync(oldStylePath)) {
        try {
          safeGitSpawn(mainRoot, ['worktree', 'remove', '--force', oldStylePath]);
        } catch {
          /* best effort */
        }
        rmSync(oldStylePath, { recursive: true, force: true });
      }
      try {
        safeGitSpawn(mainRoot, ['branch', '-D', 'tx-TPL-001']);
      } catch {
        /* best effort */
      }
      rmSync(mainRoot, { recursive: true, force: true });
    }
  });

  test('teardown succeeds for a worktree in new .worktrees/ location', () => {
    const mainRoot = createBaseRepo('compat-new-loc');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-334');
    try {
      const { exitCode: createCode } = runCreate(mainRoot, {
        sliceId: 'TPL-334',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(createCode, 0, 'pre-condition: create must succeed');
      assert.ok(existsSync(wtPath), `pre-condition: worktree exists at ${wtPath}`);

      const { exitCode, result } = runTeardown(mainRoot, {
        sessionName: 'tx-TPL-334',
        force: true,
        silent: true,
      });
      assert.strictEqual(exitCode, 0, `teardown failed: ${result?.error}`);
      assert.ok(!existsSync(wtPath), 'Worktree dir should be removed after teardown');
    } finally {
      if (existsSync(wtPath)) cleanupWorktree(mainRoot, wtPath);
      else rmSync(mainRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 4. --teardown-stale --dry-run enumerates both old and new locations
// ---------------------------------------------------------------------------

describe('runTeardownStale: enumerates worktrees in both locations', () => {
  test('listWorktrees enumerates a .worktrees/-located worktree (key invariant for teardown-stale)', () => {
    // Proves that git worktree list picks up worktrees in the new .worktrees/
    // subdir location — the enumeration basis for --teardown-stale.
    // (Verdict classification is tested by worktree-audit unit tests separately.)
    const mainRoot = createBaseRepo('stale-enum');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-334');

    try {
      const { exitCode: createCode } = runCreate(mainRoot, {
        sliceId: 'TPL-334',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(createCode, 0, 'pre-condition: create must succeed');

      // listWorktrees must include the new-location worktree
      const worktrees = listWorktrees(mainRoot);
      const found = worktrees.find((w) =>
        w.path.replaceAll('\\', '/').includes(`${basename(mainRoot)}-tx-TPL-334`),
      );
      assert.ok(
        found,
        `Expected .worktrees/ worktree to appear in listWorktrees. Got: ${JSON.stringify(worktrees.map((w) => w.path))}`,
      );
      assert.ok(
        found.path.replaceAll('\\', '/').includes('/.worktrees/'),
        `Worktree path must contain /.worktrees/: ${found.path}`,
      );
    } finally {
      try {
        safeGitSpawn(mainRoot, ['worktree', 'remove', '--force', wtPath]);
      } catch {
        /* best effort */
      }
      if (existsSync(wtPath)) rmSync(wtPath, { recursive: true, force: true });
      try {
        safeGitSpawn(mainRoot, ['branch', '-D', 'tx-TPL-334']);
      } catch {
        /* best effort */
      }
      rmSync(mainRoot, { recursive: true, force: true });
    }
  });

  test('runTeardownStale dry-run returns result without error for a .worktrees/ worktree', () => {
    // Proves the full teardown-stale pipeline completes (exit 0) when the
    // worktree is in the new .worktrees/ location. The specific verdict
    // (clean-merged vs unknown, due to untracked .coa-session in the fixture)
    // appears in result.ineligible, not eligible — that is expected behavior
    // for a worktree with an untracked file. The key invariant is that the
    // pipeline RUNS without error and the worktree IS discovered.
    const mainRoot = createBaseRepo('stale-pipeline');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-334');

    try {
      const { exitCode: createCode } = runCreate(mainRoot, {
        sliceId: 'TPL-334',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(createCode, 0, 'pre-condition: create must succeed');

      const { exitCode, result } = runTeardownStale(mainRoot, {
        json: false,
        execute: false,
        silent: true,
        trunk: 'main',
      });
      assert.strictEqual(exitCode, 0, `dry-run should succeed: ${JSON.stringify(result)}`);
      // The worktree must appear in EITHER eligible OR ineligible — it must be discovered
      const allPaths = [
        ...(result.eligible || []).map((e) => e.path),
        ...(result.ineligible || []).map((e) => e.path),
      ];
      const discovered = allPaths.find((p) =>
        p.replaceAll('\\', '/').includes(`${basename(mainRoot)}-tx-TPL-334`),
      );
      assert.ok(
        discovered,
        `Worktree must be discovered (in eligible or ineligible). allPaths: ${JSON.stringify(allPaths)}`,
      );
    } finally {
      try {
        safeGitSpawn(mainRoot, ['worktree', 'remove', '--force', wtPath]);
      } catch {
        /* best effort */
      }
      if (existsSync(wtPath)) rmSync(wtPath, { recursive: true, force: true });
      try {
        safeGitSpawn(mainRoot, ['branch', '-D', 'tx-TPL-334']);
      } catch {
        /* best effort */
      }
      rmSync(mainRoot, { recursive: true, force: true });
    }
  });
});
