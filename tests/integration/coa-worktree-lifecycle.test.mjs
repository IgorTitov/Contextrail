/* @HEADER
 * @version 0.7.119 | 2026-05-06
 * @purpose Integration tests proving R4 / ADR-0016 worktree lifecycle invariants — audit verdicts, safe refresh, operator-gated teardown — end-to-end against tmpdir bare-repo fixtures using safeGit (R1, ADR-0015).
 * @sidecar coa-worktree-lifecycle.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R4 worktree-lifecycle integration tests.
 *
 * Every git invocation in this file goes through safeGit / safeGitSpawn
 * from tests/_setup/safe-git.mjs. The R1 static check
 * (scripts/checks/test-isolation-check.mjs, ADR-0015) WILL reject any
 * direct execSync('git ...') here at pre-commit time. The runtime guard
 * (tests/_setup/no-live-git.mjs) WILL also throw at runtime. Both
 * defenses keep the test from leaking writes into the live repo even if
 * a parent shell sets GIT_DIR.
 *
 * The tests build small bare repos under tmpdir(), create linked
 * worktrees inside additional tmpdir-rooted directories, simulate the
 * states described in ADR-0016 (clean-active, clean-merged,
 * stale-merged-with-stamp-residue, stale-merged-with-wip,
 * divergent-with-wip, divergent-stamp-only, merge-in-progress), then
 * call the exported runAudit / runRefresh / runTeardownStale helpers
 * with the tmp repo as repoRoot. Tests assert on the returned result
 * struct AND on filesystem state (audit log, worktree presence,
 * marker files).
 *
 * @see docs/adr/0016-worktree-lifecycle.md
 * @see docs/adr/0015-test-isolation-enforcement.md
 */

import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
  existsSync,
  rmSync,
  statSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { safeGit, safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  runAudit,
  runRefresh,
  runTeardownStale,
  runCreate,
  resolveAuditLogPath,
  resolveWorktreePath,
} from '../../scripts/coa-worktree.mjs';
import { VERDICTS } from '../../scripts/lib/worktree-audit.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Create a bare-repo-style fixture: a git-init'd primary worktree with
 * one initial commit, three header-bearing files, and a `main` branch.
 * Returns { root, mainWorktree } where mainWorktree is the primary
 * checkout (which IS root in this layout — git init's a normal repo,
 * not a true bare repo, so the operator's working tree IS the trunk
 * worktree).
 */
function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `r4-${label}-`));
  // Use safeGitSpawn for any args that contain whitespace — safeGit
  // joins arrays with a space and re-shells the result, which would
  // re-split a value like "test@r4.local" or "R4 Test".
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@r4.local']);
  safeGitSpawn(root, ['config', 'user.name', 'R4 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

  // Three header-bearing files — slim ADR-0009 inline header so the
  // stamp-only classifier has something realistic to chew on.
  for (const name of ['file-a.mjs', 'file-b.mjs', 'file-c.mjs']) {
    writeFileSync(
      join(root, name),
      [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-04-29',
        ` * @purpose Fixture file ${name}.`,
        ' * @sidecar ' + name + '.header.md',
        ' * @layer tests | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        `export const NAME = ${JSON.stringify(name)};`,
        '',
      ].join('\n'),
    );
  }

  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'file-a.mjs', 'file-b.mjs', 'file-c.mjs', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return { root, mainWorktree: root };
}

/**
 * Add a linked worktree at <root>/../<name> and check out a new branch
 * forked off main. Returns the worktree path. Caller can then mutate
 * files inside the worktree to set up specific verdict states.
 */
function addWorktree(root, name, branchName) {
  const wtPath = mkdtempSync(join(tmpdir(), `r4-wt-${name}-`));
  // mkdtempSync already created the dir — git worktree add needs it
  // NOT to exist. Remove and let git create.
  rmSync(wtPath, { recursive: true, force: true });
  const branch = branchName || `feat/${name}`;
  // tmpdir paths can contain whitespace; use spawn form to keep argv
  // explicit and avoid shell re-tokenization.
  safeGitSpawn(root, ['worktree', 'add', '-b', branch, wtPath, 'main']);
  return { path: wtPath, branch };
}

/**
 * Stamp residue: bump the @version line in <wtPath>/<filename> from
 * 0.1.0 to 0.7.37 (a typical post-commit residue shape) without
 * staging or committing. Mimics the Zvenix incident's accumulated
 * stamp-residue worktrees.
 */
function applyStampResidue(wtPath, filename) {
  const file = join(wtPath, filename);
  const text = readFileSync(file, 'utf8');
  const replaced = text.replace(
    / \* @version 0\.1\.0 \| 2026-04-29/,
    ' * @version 0.7.37 | 2026-04-29',
  );
  if (text === replaced) {
    throw new Error(`applyStampResidue: no @version line found in ${file}`);
  }
  writeFileSync(file, replaced);
}

/**
 * Apply a real logic edit to a fixture file (different from a header
 * stamp). Adds a body line so the diff is unmistakably has-logic.
 */
function applyLogicEdit(wtPath, filename, marker = 'logic-edit') {
  const file = join(wtPath, filename);
  const text = readFileSync(file, 'utf8');
  writeFileSync(file, text + `\n// ${marker}\n`);
}

/**
 * Commit a change inside a linked worktree onto its current branch
 * (NOT main). Used to simulate a divergent branch with a real commit.
 */
function commitInWorktree(wtPath, message) {
  safeGitSpawn(wtPath, ['add', '-A']);
  // message contains spaces — must use spawn form so argv stays explicit.
  safeGitSpawn(wtPath, ['commit', '-m', message]);
}

/**
 * Merge a linked worktree's branch back into main so the branch
 * becomes "merged" for `git merge-base --is-ancestor` purposes.
 */
function mergeBranchIntoMain(root, branch) {
  safeGitSpawn(root, ['checkout', 'main']);
  safeGitSpawn(root, ['merge', '--no-ff', '--no-edit', branch]);
}

/**
 * Fake a partial-merge state in a worktree by writing MERGE_HEAD into
 * its git dir. Simpler than running an actual conflicting merge.
 */
function fakeMergeInProgress(root, wtPath) {
  // For linked worktrees, .git/MERGE_HEAD goes inside the worktree's
  // private dir under the common .git/worktrees/<name>/.
  const probe = safeGitSpawn(wtPath, ['rev-parse', '--git-dir']);
  const gitDir = probe.stdout.trim();
  // Resolve relative to the worktree.
  if (!gitDir) throw new Error('fakeMergeInProgress: rev-parse failed');
  const absoluteGitDir = resolve(wtPath, gitDir);
  writeFileSync(join(absoluteGitDir, 'MERGE_HEAD'), 'deadbeef\n');
}

/**
 * Make stdout silent during a runAudit / runRefresh / runTeardownStale
 * call. Returns a helper that yields the captured lines plus a cleanup.
 * Tests prefer `silent: true` opt instead — kept here for the rare
 * case a code path doesn't honor silent.
 */
function withSilencedStdout(fn) {
  const origLog = console.log;
  const origErr = console.error;
  const lines = [];
  console.log = (...a) => lines.push(['log', a.join(' ')]);
  console.error = (...a) => lines.push(['err', a.join(' ')]);
  try {
    return { result: fn(), lines };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runAudit — verdict taxonomy reachable end-to-end', () => {
  let fixture;

  before(() => {
    fixture = createBaseRepo('audit-clean');
  });
  after(() => {
    rmSync(fixture.root, { recursive: true, force: true });
  });

  test('1. clean primary worktree (main, no dirty) → clean-active', () => {
    const { result } = runAudit(fixture.root, { silent: true });
    assert.equal(result.ok, true);
    assert.equal(result.worktrees.length, 1);
    const r = result.worktrees[0];
    assert.equal(r.branch, 'main');
    assert.equal(r.isPrimary, true);
    assert.equal(r.isMainBranch, true);
    assert.equal(r.verdict, VERDICTS.CLEAN_ACTIVE);
    assert.equal(r.status.dirtyCount, 0);
  });
});

describe('runAudit — merged & residue states', () => {
  let fixture, wtPath, branch;

  beforeEach(() => {
    fixture = createBaseRepo('merged');
    ({ path: wtPath, branch } = addWorktree(fixture.root, 'merged', 'merged-branch'));
    // Make a real commit in the worktree, then merge it into main so
    // the branch's HEAD becomes an ancestor of main.
    applyLogicEdit(wtPath, 'file-a.mjs', 'merged-work');
    commitInWorktree(wtPath, 'merged work');
    mergeBranchIntoMain(fixture.root, branch);
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
    if (wtPath && existsSync(wtPath)) rmSync(wtPath, { recursive: true, force: true });
  });

  test('2. merged worktree, no dirty → clean-merged', () => {
    const { result } = runAudit(fixture.root, { silent: true });
    const r = result.worktrees.find((w) => basename(w.path) === basename(wtPath));
    assert.ok(r, 'expected the merged worktree to be in audit results');
    assert.equal(r.isMerged, true);
    assert.equal(r.verdict, VERDICTS.CLEAN_MERGED);
    assert.equal(r.status.dirtyCount, 0);
  });

  test('3. merged worktree with stamp-only residue → stale-merged-with-stamp-residue', () => {
    applyStampResidue(wtPath, 'file-a.mjs');
    applyStampResidue(wtPath, 'file-b.mjs');
    const { result } = runAudit(fixture.root, { silent: true });
    const r = result.worktrees.find((w) => basename(w.path) === basename(wtPath));
    assert.equal(r.verdict, VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE);
    assert.equal(r.diffShape.stampOnlyCount, 2);
    assert.equal(r.diffShape.logicChangedCount, 0);
  });

  test('4. merged worktree with logic WIP → stale-merged-with-wip', () => {
    applyLogicEdit(wtPath, 'file-a.mjs', 'wip-after-merge');
    const { result } = runAudit(fixture.root, { silent: true });
    const r = result.worktrees.find((w) => basename(w.path) === basename(wtPath));
    assert.equal(r.verdict, VERDICTS.STALE_MERGED_WITH_WIP);
    assert.ok(r.diffShape.logicChangedCount >= 1);
  });
});

describe('runAudit — divergent states', () => {
  let fixture, wtPath, branch;

  beforeEach(() => {
    fixture = createBaseRepo('divergent');
    ({ path: wtPath, branch } = addWorktree(fixture.root, 'div', 'div-branch'));
    applyLogicEdit(wtPath, 'file-a.mjs', 'divergent-work');
    commitInWorktree(wtPath, 'divergent work');
    // Do NOT merge into main — branch stays divergent.
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('5. divergent worktree with logic WIP → divergent-with-wip', () => {
    applyLogicEdit(wtPath, 'file-b.mjs', 'more-wip');
    const { result } = runAudit(fixture.root, { silent: true });
    const r = result.worktrees.find((w) => basename(w.path) === basename(wtPath));
    assert.equal(r.isMerged, false);
    assert.equal(r.verdict, VERDICTS.DIVERGENT_WITH_WIP);
    assert.ok(r.diffShape.logicChangedCount >= 1);
  });

  test('6. divergent worktree with only stamp residue → divergent-stamp-only', () => {
    applyStampResidue(wtPath, 'file-b.mjs');
    const { result } = runAudit(fixture.root, { silent: true });
    const r = result.worktrees.find((w) => basename(w.path) === basename(wtPath));
    assert.equal(r.isMerged, false);
    assert.equal(r.verdict, VERDICTS.DIVERGENT_STAMP_ONLY);
    assert.equal(r.diffShape.stampOnlyCount, 1);
    assert.equal(r.diffShape.logicChangedCount, 0);
  });
});

describe('runAudit — merge-in-progress short-circuit', () => {
  let fixture, wtPath, branch;

  before(() => {
    fixture = createBaseRepo('merge-progress');
    ({ path: wtPath, branch } = addWorktree(fixture.root, 'mp', 'mp-branch'));
    fakeMergeInProgress(fixture.root, wtPath);
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('7. worktree with MERGE_HEAD present → merge-in-progress (overrides everything)', () => {
    const { result } = runAudit(fixture.root, { silent: true });
    const r = result.worktrees.find((w) => basename(w.path) === basename(wtPath));
    assert.ok(r, 'merge-in-progress worktree must appear in audit');
    assert.equal(r.status.mergeInProgress, true);
    assert.equal(r.verdict, VERDICTS.MERGE_IN_PROGRESS);
  });
});

describe('runRefresh — dry-run & execute paths', () => {
  let fixture, wtPath, branch;

  beforeEach(() => {
    fixture = createBaseRepo('refresh');
    ({ path: wtPath, branch } = addWorktree(fixture.root, 'refresh-wt', 'refresh-branch'));
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('8. refresh on stamp-only residue (dry-run) reports counts and DOES NOT mutate', () => {
    applyStampResidue(wtPath, 'file-a.mjs');
    applyStampResidue(wtPath, 'file-b.mjs');
    const before = readFileSync(join(wtPath, 'file-a.mjs'), 'utf8');
    const { result, exitCode } = runRefresh(fixture.root, {
      name: basename(wtPath),
      silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'dry-run');
    assert.equal(result.classified.stampOnly, 2);
    assert.equal(result.classified.hasLogic, 0);
    assert.equal(result.restored.length, 0);
    assert.equal(readFileSync(join(wtPath, 'file-a.mjs'), 'utf8'), before);
  });

  test('9. refresh on stamp-only residue (--execute) restores files; status clean afterward', () => {
    applyStampResidue(wtPath, 'file-a.mjs');
    applyStampResidue(wtPath, 'file-b.mjs');
    const { result, exitCode } = runRefresh(fixture.root, {
      name: basename(wtPath),
      execute: true,
      silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.mode, 'execute');
    assert.equal(result.restored.length, 2);

    const status = safeGitSpawn(wtPath, ['status', '--porcelain']);
    assert.equal(status.stdout.trim(), '', 'worktree must be clean after refresh --execute');
  });

  test('10. refresh on mixed residue restores stamp-only, preserves logic-changed', () => {
    applyStampResidue(wtPath, 'file-a.mjs');
    applyLogicEdit(wtPath, 'file-b.mjs', 'real-wip');
    const { result } = runRefresh(fixture.root, {
      name: basename(wtPath),
      execute: true,
      silent: true,
    });
    assert.equal(result.restored.length, 1);
    assert.deepEqual(result.restored, ['file-a.mjs']);
    // file-b.mjs still has logic edits — preserved.
    const fileB = readFileSync(join(wtPath, 'file-b.mjs'), 'utf8');
    assert.match(fileB, /real-wip/);
  });

  test('11. refresh refuses if mergeInProgress', () => {
    applyStampResidue(wtPath, 'file-a.mjs');
    fakeMergeInProgress(fixture.root, wtPath);
    const { result, exitCode } = runRefresh(fixture.root, {
      name: basename(wtPath),
      execute: true,
      silent: true,
    });
    assert.equal(exitCode, 1);
    assert.equal(result.ok, false);
    assert.match(result.error, /merge in progress/i);
  });

  test('12. refresh refuses if stagedCount > 0', () => {
    applyStampResidue(wtPath, 'file-a.mjs');
    safeGitSpawn(wtPath, ['add', 'file-a.mjs']);
    const { result, exitCode } = runRefresh(fixture.root, {
      name: basename(wtPath),
      execute: true,
      silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.error, /staged/i);
  });

  test('13. refresh refuses on non-existent worktree name', () => {
    const { result, exitCode } = runRefresh(fixture.root, {
      name: 'no-such-worktree',
      execute: true,
      silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.error, /not found/i);
  });

  test('14. refresh refuses on the primary worktree', () => {
    const { result, exitCode } = runRefresh(fixture.root, {
      name: basename(fixture.root),
      execute: true,
      silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.error, /primary worktree/i);
  });
});

describe('runRefresh — claim and cwd guards', () => {
  let fixture, wtPath, branch;

  beforeEach(() => {
    fixture = createBaseRepo('refresh-guards');
    ({ path: wtPath, branch } = addWorktree(fixture.root, 'rg', 'rg-branch'));
    applyStampResidue(wtPath, 'file-a.mjs');
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('15. refresh refuses if a claim references the branch', () => {
    const claimsDir = join(fixture.root, '.claims');
    mkdirSync(claimsDir, { recursive: true });
    writeFileSync(
      join(claimsDir, 'clm-test01.json'),
      JSON.stringify(
        {
          id: 'clm-test01',
          agent: 'someone-else',
          slice: 'TPL-X',
          targets: ['file-a.mjs'],
          action: 'modify',
          status: 'active',
          notes: `working on branch ${branch}`,
        },
        null,
        2,
      ),
    );

    const { result, exitCode } = runRefresh(fixture.root, {
      name: basename(wtPath),
      execute: true,
      silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.error, /claim references/i);
  });
});

describe('runTeardownStale — dry-run & execute', () => {
  let fixture, wtMerged, wtMergedBranch, wtDirty, wtDirtyBranch;

  beforeEach(() => {
    fixture = createBaseRepo('teardown');
    ({ path: wtMerged, branch: wtMergedBranch } = addWorktree(
      fixture.root,
      'merged',
      'merged-branch',
    ));
    applyLogicEdit(wtMerged, 'file-a.mjs', 'merged-work');
    commitInWorktree(wtMerged, 'merged work');
    mergeBranchIntoMain(fixture.root, wtMergedBranch);
    // Dirty divergent worktree — should be ineligible.
    ({ path: wtDirty, branch: wtDirtyBranch } = addWorktree(fixture.root, 'dirty', 'dirty-branch'));
    applyLogicEdit(wtDirty, 'file-b.mjs', 'real-wip');
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('16. teardown-stale --dry-run lists merged-clean candidate, marks ineligible others', () => {
    const { result, exitCode } = runTeardownStale(fixture.root, { silent: true });
    assert.equal(exitCode, 0);
    assert.equal(result.mode, 'dry-run');
    assert.equal(result.eligible.length, 1);
    assert.equal(basename(result.eligible[0].path), basename(wtMerged));
    // Dirty worktree must not be eligible.
    assert.ok(
      result.ineligible.some((i) => basename(i.path) === basename(wtDirty)),
      'dirty worktree must appear in ineligible list',
    );
    // Marker file is written.
    const markerFiles = require_marker_files(fixture.root);
    assert.equal(markerFiles.length, 1);
  });

  test('17. teardown-stale --execute requires COA_OPERATOR=1', () => {
    runTeardownStale(fixture.root, { silent: true }); // marker
    const orig = process.env.COA_OPERATOR;
    delete process.env.COA_OPERATOR;
    try {
      const { result, exitCode } = runTeardownStale(fixture.root, {
        execute: true,
        silent: true,
      });
      assert.equal(exitCode, 1);
      assert.match(result.error, /COA_OPERATOR=1/);
    } finally {
      if (orig !== undefined) process.env.COA_OPERATOR = orig;
    }
  });

  test('18. teardown-stale --execute requires prior --dry-run marker', () => {
    // No --dry-run was run for this candidate set.
    process.env.COA_OPERATOR = '1';
    try {
      const { result, exitCode } = runTeardownStale(fixture.root, {
        execute: true,
        silent: true,
      });
      assert.equal(exitCode, 1);
      assert.match(result.error, /dry-run marker/);
    } finally {
      delete process.env.COA_OPERATOR;
    }
  });

  test('19. teardown-stale --execute removes the merged-clean worktree, writes audit log', () => {
    runTeardownStale(fixture.root, { silent: true }); // marker
    process.env.COA_OPERATOR = '1';
    try {
      const { result, exitCode } = runTeardownStale(fixture.root, {
        execute: true,
        silent: true,
      });
      assert.equal(exitCode, 0, `expected ok teardown; got: ${JSON.stringify(result)}`);
      assert.equal(result.torn.length, 1);
      assert.equal(basename(result.torn[0].path), basename(wtMerged));

      // Worktree directory should be gone.
      assert.equal(existsSync(wtMerged), false);

      // Audit log must contain the worktree-teardown event.
      const log = readFileSync(resolveAuditLogPath(fixture.root), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      const tearEvents = log.filter((e) => e.event === 'worktree-teardown');
      assert.equal(tearEvents.length, 1);
      assert.equal(basename(tearEvents[0].path), basename(wtMerged));
      assert.equal(tearEvents[0].verdict, VERDICTS.CLEAN_MERGED);
      assert.equal(tearEvents[0].branch, wtMergedBranch);
    } finally {
      delete process.env.COA_OPERATOR;
    }
  });

  test('20. teardown-stale skips worktree with stamp-residue (must --refresh first)', () => {
    // Apply stamp residue to the merged worktree — verdict shifts to
    // stale-merged-with-stamp-residue, which is NOT eligible for
    // teardown-stale.
    applyStampResidue(wtMerged, 'file-c.mjs');
    const { result } = runTeardownStale(fixture.root, { silent: true });
    assert.equal(result.eligible.length, 0);
    assert.ok(
      result.ineligible.some(
        (i) =>
          basename(i.path) === basename(wtMerged) &&
          i.reason === VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE,
      ),
      'stamp-residue worktree must be marked ineligible by verdict',
    );
  });

  test('21. teardown-stale --execute aborts a candidate when audit-log write fails', () => {
    // Prepare a marker.
    runTeardownStale(fixture.root, { silent: true });
    // Make .claims/audit.log a directory so appendFileSync throws.
    const logPath = resolveAuditLogPath(fixture.root);
    rmSync(logPath, { force: true });
    mkdirSync(logPath, { recursive: true });

    process.env.COA_OPERATOR = '1';
    try {
      const { result } = runTeardownStale(fixture.root, {
        execute: true,
        silent: true,
      });
      assert.equal(result.ok, false);
      assert.equal(result.torn.length, 0);
      assert.equal(result.failures.length, 1);
      assert.match(result.failures[0].reason, /audit-log/);
      // Worktree must NOT have been removed.
      assert.equal(existsSync(wtMerged), true);
    } finally {
      delete process.env.COA_OPERATOR;
      rmSync(logPath, { recursive: true, force: true });
    }
  });

  test('22. teardown-stale skips candidate when claim references the branch', () => {
    const claimsDir = join(fixture.root, '.claims');
    mkdirSync(claimsDir, { recursive: true });
    writeFileSync(
      join(claimsDir, 'clm-block.json'),
      JSON.stringify(
        {
          id: 'clm-block',
          agent: 'someone',
          slice: 'TPL-X',
          targets: ['file-a.mjs'],
          action: 'modify',
          status: 'active',
          notes: `coordinating on ${wtMergedBranch}`,
        },
        null,
        2,
      ),
    );

    const { result } = runTeardownStale(fixture.root, { silent: true });
    assert.equal(result.eligible.length, 0);
    assert.ok(
      result.ineligible.some(
        (i) => basename(i.path) === basename(wtMerged) && i.reason === 'claim-active',
      ),
      'claim-blocked worktree must appear ineligible with claim-active reason',
    );
  });

  test('23. teardown-stale --preserve=<branch> respects the pin', () => {
    const { result } = runTeardownStale(fixture.root, {
      preserve: wtMergedBranch,
      silent: true,
    });
    assert.equal(result.eligible.length, 0);
    assert.ok(
      result.ineligible.some(
        (i) => basename(i.path) === basename(wtMerged) && i.reason === 'preserved',
      ),
      'preserve list must keep the named branch out of eligibility',
    );
  });
});

// ---------------------------------------------------------------------------
// TPL-263 regression tests (4 bundled fixes)
// ---------------------------------------------------------------------------

describe('TPL-263 Bug1: stale REBASE_HEAD artifact does not trigger merge-in-progress', () => {
  let fixture, wtPath;

  before(() => {
    fixture = createBaseRepo('rebase-head');
    ({ path: wtPath } = addWorktree(fixture.root, 'rh', 'rh-branch'));
    // Simulate a stale REBASE_HEAD file left over from an interrupted
    // rebase — without creating the authoritative rebase-merge or
    // rebase-apply directories.
    const probe = safeGitSpawn(wtPath, ['rev-parse', '--git-dir']);
    const gitDir = resolve(wtPath, probe.stdout.trim());
    writeFileSync(join(gitDir, 'REBASE_HEAD'), 'deadbeef\n');
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('REBASE_HEAD file alone does not classify as merge-in-progress', () => {
    const { result } = runAudit(fixture.root, { silent: true });
    const r = result.worktrees.find((w) => basename(w.path) === basename(wtPath));
    assert.ok(r, 'worktree must appear in audit results');
    assert.equal(
      r.status.rebaseInProgress,
      false,
      'rebaseInProgress must be false without directory markers',
    );
    assert.notEqual(
      r.verdict,
      VERDICTS.MERGE_IN_PROGRESS,
      'stale REBASE_HEAD must not produce merge-in-progress verdict',
    );
  });
});

describe('TPL-263 Bug2: primary trunk worktree with WIP classified clean-active', () => {
  let fixture;

  before(() => {
    fixture = createBaseRepo('primary-wip');
  });
  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('primary worktree on main with uncommitted changes returns clean-active', () => {
    applyLogicEdit(fixture.root, 'file-a.mjs', 'primary-wip');
    const { result } = runAudit(fixture.root, { silent: true });
    const primary = result.worktrees.find((w) => w.isPrimary && w.isMainBranch);
    assert.ok(primary, 'primary trunk worktree must appear in audit results');
    assert.ok(
      primary.status.dirtyCount > 0,
      'primary must have dirty files for this test to be meaningful',
    );
    assert.equal(
      primary.verdict,
      VERDICTS.CLEAN_ACTIVE,
      'primary trunk with WIP must be clean-active, not stale-merged-with-wip',
    );
  });
});

describe('TPL-263 Bug3: audit display table suppresses dirty-count hint for clean-active verdicts', () => {
  let fixture;

  before(() => {
    fixture = createBaseRepo('hint-suppress');
  });
  after(() => {
    // Restore file-a.mjs so subsequent tests are not polluted.
    try {
      safeGitSpawn(fixture.root, ['checkout', '--', 'file-a.mjs']);
    } catch {
      /* best effort */
    }
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('clean-active row in display table has no "(N files)" suffix even when dirty', () => {
    applyLogicEdit(fixture.root, 'file-a.mjs', 'hint-check-wip');
    const { lines } = withSilencedStdout(() => runAudit(fixture.root, {}));
    const tableLines = lines.filter(([type]) => type === 'log').map(([, text]) => text);
    const cleanActiveRow = tableLines.find((t) => t.includes('clean-active'));
    assert.ok(cleanActiveRow, 'audit table must have a clean-active row');
    assert.ok(
      !cleanActiveRow.includes('files)'),
      `clean-active row must not show dirty-count hint; got: ${cleanActiveRow}`,
    );
  });
});

describe('TPL-263 TPL-255: --teardown resolves worktree path via git worktree list', () => {
  let fixture, wtPath, branch;

  before(() => {
    fixture = createBaseRepo('tpl255');
    ({ path: wtPath, branch } = addWorktree(fixture.root, 'tx-slice', 'tx-TPL-255'));
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('resolveWorktreePath matches by branch name (tx-TPL-255 → full path)', () => {
    const resolved = resolveWorktreePath(fixture.root, 'tx-TPL-255');
    assert.ok(resolved, 'resolveWorktreePath must find worktree by branch name');
    // Normalize slashes: git porcelain uses / on Windows; mkdtempSync uses \.
    assert.equal(
      resolved.replaceAll('\\', '/'),
      wtPath.replaceAll('\\', '/'),
      'resolved path must equal the actual worktree path',
    );
  });

  test('resolveWorktreePath matches by basename', () => {
    const resolved = resolveWorktreePath(fixture.root, basename(wtPath));
    assert.ok(resolved, 'resolveWorktreePath must find worktree by basename');
    assert.equal(resolved.replaceAll('\\', '/'), wtPath.replaceAll('\\', '/'));
  });

  test('resolveWorktreePath matches by full path', () => {
    const resolved = resolveWorktreePath(fixture.root, wtPath);
    assert.ok(resolved, 'resolveWorktreePath must find worktree by full path');
    assert.equal(resolved.replaceAll('\\', '/'), wtPath.replaceAll('\\', '/'));
  });

  test('resolveWorktreePath returns null for unknown name', () => {
    const resolved = resolveWorktreePath(fixture.root, 'no-such-worktree-anywhere');
    assert.equal(resolved, null, 'must return null for unknown name');
  });
});

// ---------------------------------------------------------------------------
// TPL-312 — --teardown-stale --include-dirty operator-gated bulk cleanup
// ---------------------------------------------------------------------------

describe('TPL-312: --teardown-stale --include-dirty bulk cleanup', () => {
  let fixture, wtClean, wtCleanBranch, wtDirty, wtDirtyBranch, wtUnmerged, wtUnmergedBranch;

  beforeEach(() => {
    fixture = createBaseRepo('include-dirty');
    // Merged-clean tx-* branch
    ({ path: wtClean, branch: wtCleanBranch } = addWorktree(fixture.root, 'tx-A', 'tx-A'));
    applyLogicEdit(wtClean, 'file-a.mjs', 'work-A');
    commitInWorktree(wtClean, 'work A');
    mergeBranchIntoMain(fixture.root, wtCleanBranch);
    // Merged-dirty tx-* branch (real WIP after merge)
    ({ path: wtDirty, branch: wtDirtyBranch } = addWorktree(fixture.root, 'tx-B', 'tx-B'));
    applyLogicEdit(wtDirty, 'file-b.mjs', 'work-B');
    commitInWorktree(wtDirty, 'work B');
    mergeBranchIntoMain(fixture.root, wtDirtyBranch);
    applyLogicEdit(wtDirty, 'file-c.mjs', 'wip-after-merge');
    // Unmerged-clean tx-* branch (must always be preserved)
    ({ path: wtUnmerged, branch: wtUnmergedBranch } = addWorktree(fixture.root, 'tx-C', 'tx-C'));
    applyLogicEdit(wtUnmerged, 'file-a.mjs', 'work-C');
    commitInWorktree(wtUnmerged, 'work C');
  });

  after(() => {
    if (fixture) rmSync(fixture.root, { recursive: true, force: true });
  });

  test('1. --execute without --include-dirty preserves merged-but-dirty (regression)', () => {
    runTeardownStale(fixture.root, { silent: true });
    process.env.COA_OPERATOR = '1';
    try {
      const { result, exitCode } = runTeardownStale(fixture.root, { execute: true, silent: true });
      assert.equal(exitCode, 0);
      assert.equal(result.torn.length, 1);
      assert.equal(basename(result.torn[0].path), basename(wtClean));
      assert.equal(existsSync(wtDirty), true, 'dirty merged worktree must remain');
      assert.equal(existsSync(wtUnmerged), true, 'unmerged worktree must remain');
    } finally {
      delete process.env.COA_OPERATOR;
    }
  });

  test('2. --execute --include-dirty refuses without COA_OPERATOR=1', () => {
    runTeardownStale(fixture.root, { includeDirty: true, silent: true });
    const orig = process.env.COA_OPERATOR;
    delete process.env.COA_OPERATOR;
    try {
      const { result, exitCode } = runTeardownStale(fixture.root, {
        execute: true,
        includeDirty: true,
        silent: true,
      });
      assert.equal(exitCode, 1);
      assert.match(result.error, /COA_OPERATOR=1/);
    } finally {
      if (orig !== undefined) process.env.COA_OPERATOR = orig;
    }
  });

  test('3. --execute --include-dirty + COA_OPERATOR=1 tears down merged-clean AND merged-dirty', () => {
    runTeardownStale(fixture.root, { includeDirty: true, silent: true });
    process.env.COA_OPERATOR = '1';
    try {
      const { result, exitCode } = runTeardownStale(fixture.root, {
        execute: true,
        includeDirty: true,
        silent: true,
      });
      assert.equal(exitCode, 0, `expected ok; got ${JSON.stringify(result)}`);
      assert.equal(result.torn.length, 2);
      assert.equal(existsSync(wtClean), false);
      assert.equal(existsSync(wtDirty), false);
      assert.equal(existsSync(wtUnmerged), true, 'unmerged worktree must be preserved');
      const dirtyEntry = result.torn.find((t) => t.dirty === true);
      assert.ok(dirtyEntry, 'one of the torn entries must be marked dirty=true');
      assert.equal(basename(dirtyEntry.path), basename(wtDirty));
    } finally {
      delete process.env.COA_OPERATOR;
    }
  });

  test('4. --include-dirty does NOT touch unmerged tx-* (ancestor safety preserved)', () => {
    const { result } = runTeardownStale(fixture.root, { includeDirty: true, silent: true });
    const eligiblePaths = result.eligible.map((e) => basename(e.path));
    assert.ok(
      !eligiblePaths.includes(basename(wtUnmerged)),
      'unmerged worktree must never appear in eligible set',
    );
    assert.ok(
      result.ineligible.some((i) => basename(i.path) === basename(wtUnmerged)),
      'unmerged worktree must appear in ineligible list',
    );
  });

  test('5. audit log entry for dirty teardown uses worktree-teardown-dirty event', () => {
    runTeardownStale(fixture.root, { includeDirty: true, silent: true });
    process.env.COA_OPERATOR = '1';
    try {
      runTeardownStale(fixture.root, { execute: true, includeDirty: true, silent: true });
      const log = readFileSync(resolveAuditLogPath(fixture.root), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      const dirtyEvents = log.filter((e) => e.event === 'worktree-teardown-dirty');
      assert.equal(dirtyEvents.length, 1);
      assert.equal(basename(dirtyEvents[0].path), basename(wtDirty));
      assert.equal(dirtyEvents[0].verdict, VERDICTS.STALE_MERGED_WITH_WIP);
      assert.match(dirtyEvents[0].dirty_status_summary, /dirty=\d+/);
      const cleanEvents = log.filter((e) => e.event === 'worktree-teardown');
      assert.equal(cleanEvents.length, 1);
      assert.equal(basename(cleanEvents[0].path), basename(wtClean));
    } finally {
      delete process.env.COA_OPERATOR;
    }
  });

  test('6. --dry-run --include-dirty lists dirty candidates without deletion', () => {
    const { result } = runTeardownStale(fixture.root, { includeDirty: true, silent: true });
    assert.equal(result.mode, 'dry-run');
    assert.equal(result.includeDirty, true);
    assert.equal(result.eligible.length, 2);
    const dirtyEntry = result.eligible.find((e) => e.dirty === true);
    assert.ok(dirtyEntry, 'eligible list must mark merged-dirty entry with dirty=true');
    assert.equal(basename(dirtyEntry.path), basename(wtDirty));
    // Both worktrees still exist after dry-run.
    assert.equal(existsSync(wtClean), true);
    assert.equal(existsSync(wtDirty), true);
  });

  test('7. clean dry-run marker cannot authorize --include-dirty execute', () => {
    runTeardownStale(fixture.root, { silent: true }); // marker WITHOUT includeDirty
    process.env.COA_OPERATOR = '1';
    try {
      const { result, exitCode } = runTeardownStale(fixture.root, {
        execute: true,
        includeDirty: true,
        silent: true,
      });
      assert.equal(exitCode, 1);
      assert.match(result.error, /dry-run marker/);
    } finally {
      delete process.env.COA_OPERATOR;
    }
  });
});

// ---------------------------------------------------------------------------
// Test-helper utilities
// ---------------------------------------------------------------------------

/**
 * Synchronously list teardown-stale marker files inside a fixture's
 * .claims/ directory. Used by test 16 to assert marker creation.
 */
function require_marker_files(root) {
  const claimsDir = join(root, '.claims');
  if (!existsSync(claimsDir)) return [];
  return readdirSync(claimsDir).filter((f) => f.startsWith('teardown-stale-marker-'));
}
