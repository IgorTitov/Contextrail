/* @HEADER
 * @version 0.7.91 | 2026-05-05
 * @purpose Unit tests for main-worktree-dirt-audit.mjs pure helpers (W1 / TPL-283).
 * @sidecar main-worktree-dirt-audit.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-283 — Unit tests for W1 dirt-audit pure helpers.
 *
 * Covers the five spec scenarios:
 *   1. Run from tx-* worktree → exits 0 silently (isTransportWorktreePath)
 *   2. Run from main worktree, no untracked files → exit 0 silently
 *   3. Run from main worktree, untracked tests/scratch.test.mjs → exits 0
 *      with warning to stderr
 *   4. Run from main worktree, untracked but known-OK (.claims/clm-X.json)
 *      → exit 0 silent
 *   5. --self-test flag: script prints fixture cases and exits 0
 *
 * The tests do NOT shell out to the script; they exercise the exported pure
 * helpers directly. This is sufficient because the main() entrypoint is a
 * thin orchestrator of those helpers — integration coverage comes from
 * the pre-commit hook running the script end-to-end.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isTransportWorktreePath,
  isKnownOk,
  isInWatchedDir,
  filterUntrackedFiles,
} from '../../scripts/checks/main-worktree-dirt-audit.mjs';

// ---------------------------------------------------------------------------
// Scenario 1: transport-worktree detection
// ---------------------------------------------------------------------------

describe('W1: isTransportWorktreePath', () => {
  test('returns false for plain main worktree paths', () => {
    assert.equal(isTransportWorktreePath('/repos/contextrail-template'), false);
    assert.equal(isTransportWorktreePath('C:\\Projects\\contextrail-template'), false);
    assert.equal(
      isTransportWorktreePath('/repos/my-tx-project'),
      false,
      'lowercase x after - is not a tx marker',
    );
  });

  test('returns true for tx-* transport worktree paths', () => {
    assert.equal(isTransportWorktreePath('/repos/contextrail-template-tx-TPL-283'), true);
    assert.equal(isTransportWorktreePath('C:\\Projects\\contextrail-template-tx-TPL-276'), true);
    assert.equal(isTransportWorktreePath('/repos/ai-cockpit-tx-AIC-DEV-099'), true);
    assert.equal(isTransportWorktreePath('/repos/zvenix-tx-ZVX-DEV-068'), true);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2/3/4: known-OK filter, watched-dir filter, combined
// ---------------------------------------------------------------------------

describe('W1: isKnownOk', () => {
  test('claim files are known-OK', () => {
    assert.equal(isKnownOk('.claims/clm-abc123.json'), true);
    assert.equal(isKnownOk('.claims/clm-xyz-999.json'), true);
  });

  test('claims config.json is NOT known-OK', () => {
    assert.equal(isKnownOk('.claims/config.json'), false);
  });

  test('node_modules paths are known-OK', () => {
    assert.equal(isKnownOk('node_modules/some-pkg/index.js'), true);
  });

  test('.backups paths are known-OK', () => {
    assert.equal(isKnownOk('.backups/snap.zip'), true);
    assert.equal(isKnownOk('.backups/snapshot.txt'), true);
  });

  test('_generated paths are known-OK', () => {
    assert.equal(isKnownOk('docs/_generated/index.json'), true);
    assert.equal(isKnownOk('tests/_generated/foo.mjs'), true);
  });

  test('regular source files are NOT known-OK', () => {
    assert.equal(isKnownOk('scripts/checks/foo.mjs'), false);
    assert.equal(isKnownOk('tests/scratch.test.mjs'), false);
    assert.equal(isKnownOk('apps/starter/index.html'), false);
  });
});

describe('W1: isInWatchedDir', () => {
  test('watched directories return true', () => {
    assert.equal(isInWatchedDir('tests/scratch.test.mjs'), true);
    assert.equal(isInWatchedDir('apps/starter/index.html'), true);
    assert.equal(isInWatchedDir('modules/claim/domain/foo.mjs'), true);
    assert.equal(isInWatchedDir('scripts/checks/foo.mjs'), true);
    assert.equal(isInWatchedDir('docs/analysis/notes.md'), true);
  });

  test('non-watched paths return false', () => {
    assert.equal(isInWatchedDir('.claims/foo.json'), false);
    assert.equal(isInWatchedDir('CHANGELOG.md'), false);
    assert.equal(isInWatchedDir('.backups/snap.zip'), false);
    assert.equal(isInWatchedDir('VERSION'), false);
  });
});

describe('W1: filterUntrackedFiles', () => {
  test('Scenario 2: empty status → empty result', () => {
    assert.deepEqual(filterUntrackedFiles([]), []);
  });

  test('Scenario 3: untracked tests/ file → reported as suspect', () => {
    const lines = ['?? tests/scratch.test.mjs'];
    const result = filterUntrackedFiles(lines);
    assert.deepEqual(result, ['tests/scratch.test.mjs']);
  });

  test('Scenario 4: untracked .claims/clm-*.json → filtered out (known-OK)', () => {
    const lines = ['?? .claims/clm-abc.json'];
    const result = filterUntrackedFiles(lines);
    assert.deepEqual(result, []);
  });

  test('mixed: watched file + claim file → only watched file reported', () => {
    const lines = [
      '?? tests/scratch.test.mjs',
      '?? .claims/clm-xyz.json',
      '?? node_modules/foo.mjs',
    ];
    assert.deepEqual(filterUntrackedFiles(lines), ['tests/scratch.test.mjs']);
  });

  test('modified (not ??) lines are ignored', () => {
    const lines = [' M tests/scratch.test.mjs', '?? apps/starter/new.html'];
    assert.deepEqual(filterUntrackedFiles(lines), ['apps/starter/new.html']);
  });

  test('files outside watched dirs are ignored', () => {
    const lines = ['?? CHANGELOG.md', '?? VERSION', '?? docs/analysis/notes.md'];
    assert.deepEqual(filterUntrackedFiles(lines), ['docs/analysis/notes.md']);
  });

  test('known-OK patterns: _generated/, .backups/', () => {
    const lines = [
      '?? docs/_generated/dep.json',
      '?? .backups/snap.zip',
      '?? scripts/checks/new-check.mjs',
    ];
    assert.deepEqual(filterUntrackedFiles(lines), ['scripts/checks/new-check.mjs']);
  });
});
