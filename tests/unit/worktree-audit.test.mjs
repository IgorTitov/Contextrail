/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for scripts/lib/worktree-audit.mjs — classifyVerdict() must reach every R4 verdict and pin its priority order so weakening the table fails CI.
 * @sidecar worktree-audit.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyVerdict,
  recommendationFor,
  isEligibleForRefresh,
  isEligibleForTeardownStale,
  VERDICTS,
  VERDICT_RECOMMENDATIONS,
} from '../../scripts/lib/worktree-audit.mjs';

// ---------------------------------------------------------------------------
// Pure classifier — no git, no fs, no time. Every test feeds a struct and
// asserts the verdict + recommendation. Tests cover each verdict at least
// once plus the priority short-circuits between them.
// ---------------------------------------------------------------------------

describe('VERDICTS table', () => {
  test('exposes the 8 R4 verdict tags as constants', () => {
    const tags = Object.values(VERDICTS).sort();
    assert.deepEqual(tags, [
      'clean-active',
      'clean-merged',
      'divergent-stamp-only',
      'divergent-with-wip',
      'merge-in-progress',
      'stale-merged-with-stamp-residue',
      'stale-merged-with-wip',
      'unknown',
    ]);
  });

  test('table is frozen (cannot be silently mutated)', () => {
    assert.throws(() => {
      VERDICTS.NEW = 'new-tag';
    }, /Cannot add property|object is not extensible|read only/i);
  });

  test('each verdict has a one-line recommendation', () => {
    for (const tag of Object.values(VERDICTS)) {
      const rec = VERDICT_RECOMMENDATIONS[tag];
      assert.ok(typeof rec === 'string' && rec.length > 0, `missing rec for ${tag}`);
    }
  });
});

describe('classifyVerdict — primary / clean-active path', () => {
  test('main branch + dirty=0 → clean-active', () => {
    const v = classifyVerdict({
      isMainBranch: true,
      isMerged: true,
      dirtyCount: 0,
      stampOnlyCount: 0,
      logicChangedCount: 0,
    });
    assert.equal(v, VERDICTS.CLEAN_ACTIVE);
  });

  test('main branch + dirty>0 → NOT clean-active (falls into stale-merged paths)', () => {
    const v = classifyVerdict({
      isMainBranch: true,
      isMerged: true,
      dirtyCount: 5,
      stampOnlyCount: 5,
      logicChangedCount: 0,
    });
    // Main-branch with stamp residue still hits the merged path —
    // operator should refresh before doing anything else.
    assert.equal(v, VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE);
  });

  test('non-main branch with merged=true and clean → clean-merged (NOT clean-active)', () => {
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: true,
      dirtyCount: 0,
    });
    assert.equal(v, VERDICTS.CLEAN_MERGED);
  });
});

describe('classifyVerdict — merged stale paths', () => {
  test('merged + stamp-only residue → stale-merged-with-stamp-residue', () => {
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: true,
      dirtyCount: 1980,
      stampOnlyCount: 1980,
      logicChangedCount: 0,
    });
    assert.equal(v, VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE);
  });

  test('merged + any logic change → stale-merged-with-wip (logic wins)', () => {
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: true,
      dirtyCount: 1984,
      stampOnlyCount: 1980,
      logicChangedCount: 4,
    });
    assert.equal(v, VERDICTS.STALE_MERGED_WITH_WIP);
  });

  test('merged + dirty but no stamp/logic counts → unknown (defensive)', () => {
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: true,
      dirtyCount: 3,
      stampOnlyCount: 0,
      logicChangedCount: 0,
    });
    assert.equal(v, VERDICTS.UNKNOWN);
  });
});

describe('classifyVerdict — divergent paths', () => {
  test('not merged + stamp-only dirty → divergent-stamp-only', () => {
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: false,
      dirtyCount: 1984,
      stampOnlyCount: 1984,
      logicChangedCount: 0,
    });
    assert.equal(v, VERDICTS.DIVERGENT_STAMP_ONLY);
  });

  test('not merged + logic change → divergent-with-wip (logic wins)', () => {
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: false,
      dirtyCount: 12,
      stampOnlyCount: 4,
      logicChangedCount: 8,
    });
    assert.equal(v, VERDICTS.DIVERGENT_WITH_WIP);
  });

  test('not merged + clean working tree → unknown (operator must inspect)', () => {
    // Branch carries unmerged commits but working tree is clean.
    // Audit cannot decide whether to merge, abandon, or keep — so
    // classifies as unknown rather than guessing.
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: false,
      dirtyCount: 0,
      stampOnlyCount: 0,
      logicChangedCount: 0,
    });
    assert.equal(v, VERDICTS.UNKNOWN);
  });
});

describe('classifyVerdict — merge-in-progress short-circuit', () => {
  test('mergeInProgress=true → merge-in-progress (overrides everything)', () => {
    // Even with a clean working tree on main, a partial merge wins.
    const v = classifyVerdict({
      isMainBranch: true,
      isMerged: true,
      dirtyCount: 0,
      mergeInProgress: true,
    });
    assert.equal(v, VERDICTS.MERGE_IN_PROGRESS);
  });

  test('rebaseInProgress=true → merge-in-progress (rebase counts too)', () => {
    const v = classifyVerdict({
      isMainBranch: false,
      isMerged: false,
      dirtyCount: 50,
      logicChangedCount: 50,
      rebaseInProgress: true,
    });
    assert.equal(v, VERDICTS.MERGE_IN_PROGRESS);
  });
});

describe('classifyVerdict — defensive defaults', () => {
  test('null / non-object input → unknown', () => {
    assert.equal(classifyVerdict(null), VERDICTS.UNKNOWN);
    assert.equal(classifyVerdict(undefined), VERDICTS.UNKNOWN);
    assert.equal(classifyVerdict('something'), VERDICTS.UNKNOWN);
    assert.equal(classifyVerdict(42), VERDICTS.UNKNOWN);
  });

  test('empty input object → unknown (all defaults trigger no rule)', () => {
    // Defaults: not main, not merged, dirty=0, no merge in progress.
    // Falls through to the not-merged + clean branch → unknown.
    const v = classifyVerdict({});
    assert.equal(v, VERDICTS.UNKNOWN);
  });

  test('boundary: dirtyCount=0 with logic counts (impossible state) → falls into clean buckets', () => {
    // logic count > 0 with dirty 0 is contradictory. The classifier
    // honors the dirty count first (clean → clean-merged or clean-active).
    const v = classifyVerdict({
      isMerged: true,
      dirtyCount: 0,
      logicChangedCount: 99,
    });
    assert.equal(v, VERDICTS.CLEAN_MERGED);
  });
});

describe('recommendationFor', () => {
  test('returns the canonical line for each verdict', () => {
    assert.equal(recommendationFor(VERDICTS.CLEAN_ACTIVE), 'leave alone');
    assert.equal(recommendationFor(VERDICTS.CLEAN_MERGED), 'safe to teardown-stale');
    assert.match(recommendationFor(VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE), /refresh/);
    assert.match(recommendationFor(VERDICTS.DIVERGENT_STAMP_ONLY), /refresh/);
    assert.match(recommendationFor(VERDICTS.MERGE_IN_PROGRESS), /complete or abort/);
  });

  test('unknown tag falls back to the unknown recommendation', () => {
    assert.equal(recommendationFor('not-a-real-tag'), VERDICT_RECOMMENDATIONS[VERDICTS.UNKNOWN]);
  });
});

describe('predicates', () => {
  test('isEligibleForTeardownStale matches only clean-merged', () => {
    assert.equal(isEligibleForTeardownStale(VERDICTS.CLEAN_MERGED), true);
    assert.equal(isEligibleForTeardownStale(VERDICTS.CLEAN_ACTIVE), false);
    assert.equal(isEligibleForTeardownStale(VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE), false);
    assert.equal(isEligibleForTeardownStale(VERDICTS.DIVERGENT_WITH_WIP), false);
    assert.equal(isEligibleForTeardownStale(VERDICTS.MERGE_IN_PROGRESS), false);
  });

  test('isEligibleForRefresh matches both stamp-only verdicts', () => {
    assert.equal(isEligibleForRefresh(VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE), true);
    assert.equal(isEligibleForRefresh(VERDICTS.DIVERGENT_STAMP_ONLY), true);
    assert.equal(isEligibleForRefresh(VERDICTS.CLEAN_MERGED), false);
    assert.equal(isEligibleForRefresh(VERDICTS.STALE_MERGED_WITH_WIP), false);
    assert.equal(isEligibleForRefresh(VERDICTS.DIVERGENT_WITH_WIP), false);
  });
});
