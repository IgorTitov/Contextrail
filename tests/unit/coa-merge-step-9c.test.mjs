/* @HEADER
 * @version 0.7.73 | 2026-05-04
 * @purpose Unit tests for coa-merge Step 9c TPL-265 defenses: validatePushUpdateInsteadWorktree, captureGitConfig, restoreGitConfig.
 * @sidecar coa-merge-step-9c.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  validatePushUpdateInsteadWorktree,
  captureGitConfig,
  restoreGitConfig,
} from '../../scripts/coa-merge.mjs';

// ---------------------------------------------------------------------------
// validatePushUpdateInsteadWorktree
// ---------------------------------------------------------------------------

describe('coa-merge Step 9c: validatePushUpdateInsteadWorktree', () => {
  test('throws for trunk branch "main"', () => {
    assert.throws(
      () => validatePushUpdateInsteadWorktree('main'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('tx-* transport worktree'));
        assert.ok(err.message.includes("'main'"));
        return true;
      },
    );
  });

  test('throws for a feature branch (not tx-*)', () => {
    assert.throws(
      () => validatePushUpdateInsteadWorktree('feature/foo'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('tx-* transport worktree'));
        assert.ok(err.message.includes("'feature/foo'"));
        return true;
      },
    );
  });

  test('does NOT throw for a valid tx-* transport branch', () => {
    assert.doesNotThrow(() => validatePushUpdateInsteadWorktree('tx-TPL-265'));
  });

  test('does NOT throw for tx-TPL-265 with lowercase suffix', () => {
    assert.doesNotThrow(() => validatePushUpdateInsteadWorktree('tx-TPL-265-defenses'));
  });

  test('throws for "master" (also trunk)', () => {
    assert.throws(
      () => validatePushUpdateInsteadWorktree('master'),
      (err) => {
        assert.ok(err.message.includes('tx-* transport worktree'));
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// captureGitConfig / restoreGitConfig — filesystem tests
// ---------------------------------------------------------------------------

describe('coa-merge Step 9c: captureGitConfig', () => {
  test('reads .git/config from a real git repo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl265-capture-'));
    try {
      safeGitSpawn(dir, ['init', '-b', 'main']);
      const captured = captureGitConfig(dir);
      assert.ok(typeof captured === 'string', 'should return a string');
      assert.ok(captured.includes('[core]'), 'should contain git [core] section');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('throws when target path has no .git/config', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl265-nogit-'));
    try {
      assert.throws(
        () => captureGitConfig(dir),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('coa-merge Step 9c: restoreGitConfig', () => {
  test('restores previously captured config after modification', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl265-restore-'));
    try {
      safeGitSpawn(dir, ['init', '-b', 'main']);

      // Capture original
      const original = captureGitConfig(dir);

      // Mutate config
      const configPath = join(dir, '.git', 'config');
      writeFileSync(configPath, original + '\n[receive]\n\tdenyCurrentBranch = updateInstead\n', 'utf8');
      const mutated = readFileSync(configPath, 'utf8');
      assert.notEqual(mutated, original, 'config should be mutated before restore');

      // Restore
      restoreGitConfig(dir, original);
      const restored = readFileSync(configPath, 'utf8');
      assert.equal(restored, original, 'restored content should match original');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('full rollback scenario: capture → mutate → restore → verify', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl265-rollback-'));
    try {
      safeGitSpawn(dir, ['init', '-b', 'main']);

      // Step 1: capture
      const captured = captureGitConfig(dir);

      // Step 2: mutate (simulate what Step 9c might do or other code)
      const configPath = join(dir, '.git', 'config');
      writeFileSync(
        configPath,
        captured + '\n[receive]\n\tdenyCurrentBranch = updateInstead\n\t[extra]\n\tbare = true\n',
        'utf8',
      );

      // Step 3: restore (simulating rollback on push failure)
      restoreGitConfig(dir, captured);

      // Step 4: verify
      const afterRestore = readFileSync(configPath, 'utf8');
      assert.equal(afterRestore, captured, 'config must match pre-mutation snapshot after rollback');
      assert.ok(!afterRestore.includes('denyCurrentBranch'), 'denyCurrentBranch must not appear after rollback');
      assert.ok(!afterRestore.includes('bare = true'), 'bare=true must not appear after rollback');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
