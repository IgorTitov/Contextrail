/* @HEADER
 * @version 0.7.122 | 2026-05-06
 * @purpose Pure verdict classifier for worktree audit — maps a structured worktree state record into one of the eight R4 lifecycle verdicts plus an operator recommendation.
 * @sidecar worktree-audit.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { resolve, basename } from 'node:path';

/**
 * R4 — worktree audit classifier.
 *
 * `classifyVerdict({...state})` accepts a struct describing one
 * worktree's measurable state (dirty count, merge progress, divergence
 * vs trunk, diff shape) and returns one of the eight verdicts in the
 * taxonomy. The classifier is pure — no git calls, no filesystem reads,
 * no time. ADR-0016 enumerates the verdicts and their semantics.
 *
 * The script (scripts/coa-worktree.mjs) collects inputs by spawning git
 * commands inside each worktree, then feeds the resulting record into
 * this classifier. Tests pin every verdict transition against fixture
 * inputs so weakening the table fails CI.
 *
 * @see scripts/coa-worktree.mjs#audit
 * @see docs/adr/0016-worktree-lifecycle.md
 */

/**
 * Verdict taxonomy — mutually exclusive labels in priority order.
 *
 * Frozen so callers cannot accidentally mutate the table; meta-tests
 * pin the shape so weakening it fails CI.
 */
export const VERDICTS = Object.freeze({
  CLEAN_ACTIVE: 'clean-active',
  CLEAN_MERGED: 'clean-merged',
  STALE_MERGED_WITH_STAMP_RESIDUE: 'stale-merged-with-stamp-residue',
  STALE_MERGED_WITH_WIP: 'stale-merged-with-wip',
  DIVERGENT_WITH_WIP: 'divergent-with-wip',
  DIVERGENT_STAMP_ONLY: 'divergent-stamp-only',
  MERGE_IN_PROGRESS: 'merge-in-progress',
  UNKNOWN: 'unknown',
});

/**
 * One-line operator recommendation for each verdict. Used by the human
 * (non-JSON) audit renderer; the JSON renderer surfaces the verdict tag
 * directly so downstream tooling can map however it likes.
 */
export const VERDICT_RECOMMENDATIONS = Object.freeze({
  [VERDICTS.CLEAN_ACTIVE]: 'leave alone',
  [VERDICTS.CLEAN_MERGED]: 'safe to teardown-stale',
  [VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE]: 'refresh, then teardown-stale',
  [VERDICTS.STALE_MERGED_WITH_WIP]: 'operator review — salvage WIP first',
  [VERDICTS.DIVERGENT_WITH_WIP]: 'operator review — this is real work',
  [VERDICTS.DIVERGENT_STAMP_ONLY]: 'refresh, then check merge',
  [VERDICTS.MERGE_IN_PROGRESS]: 'complete or abort the merge/rebase first',
  [VERDICTS.UNKNOWN]: 'operator must inspect manually',
});

/**
 * Classify one worktree's state into a verdict.
 *
 * Required input fields (object form so call sites stay readable):
 *
 *   - isMainBranch        boolean — branch IS the trunk branch
 *   - isMerged            boolean — branch's HEAD is an ancestor of trunk
 *   - mergeInProgress     boolean — .git/MERGE_HEAD or CHERRY_PICK_HEAD present
 *   - rebaseInProgress    boolean — .git/rebase-* directory present
 *   - dirtyCount          number  — non-zero count of dirty (modified|added|untracked) entries
 *   - stampOnlyCount      number  — files whose diff is exclusively @version stamp(s)
 *   - logicChangedCount   number  — files with at least one non-stamp diff
 *
 * Optional / informational fields are passed through to records but do
 * not affect the verdict: stagedCount, untrackedCount, ahead/behind.
 *
 * Order matters — the classifier short-circuits at each rule. A merge
 * in progress always wins over divergence/dirty checks; a clean main
 * worktree always wins over the dirty-state branches.
 */
export function classifyVerdict(state) {
  if (!state || typeof state !== 'object') return VERDICTS.UNKNOWN;
  const {
    isMainBranch = false,
    isMerged = false,
    mergeInProgress = false,
    rebaseInProgress = false,
    dirtyCount = 0,
    stampOnlyCount = 0,
    logicChangedCount = 0,
  } = state;

  const nested = state.isNestedInsideRepo === true;
  const knownInfra = state.isKnownInfraWorktree === true;

  if (mergeInProgress || rebaseInProgress) {
    return VERDICTS.MERGE_IN_PROGRESS;
  }

  // Nested permanent-infrastructure protection (TPL-315 / ADR-0041).
  // Worktrees nested inside the repo root are not ceremony tx-* worktrees
  // — they are persistent infra (e.g. `.cockpit-stable` build cache). They
  // must never be classified as CLEAN_MERGED, regardless of whether HEAD
  // happens to be an ancestor of trunk.
  // Two layers of defense:
  //   - knownInfra basename (e.g. `.cockpit-stable`) wins even when dirty,
  //     because Cockpit may rebuild the cache periodically — partial dirt
  //     is normal and does not mean "stale".
  //   - generic nested + clean → CLEAN_ACTIVE (covers future infra patterns).
  if (knownInfra && nested) {
    return VERDICTS.CLEAN_ACTIVE;
  }
  if (nested && dirtyCount === 0) {
    return VERDICTS.CLEAN_ACTIVE;
  }

  // The trunk worktree (or any worktree currently on the trunk branch)
  // with a clean working tree is the "leave alone" baseline. Even if
  // its branch is technically "merged into itself", calling it
  // clean-merged would invite teardown of trunk — which is not what
  // the verdict means.
  if (isMainBranch && dirtyCount === 0) {
    return VERDICTS.CLEAN_ACTIVE;
  }

  if (isMerged) {
    if (dirtyCount === 0) return VERDICTS.CLEAN_MERGED;
    if (logicChangedCount > 0) return VERDICTS.STALE_MERGED_WITH_WIP;
    if (stampOnlyCount > 0) return VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE;
    return VERDICTS.UNKNOWN;
  }

  // Not merged into trunk yet — real divergence.
  if (logicChangedCount > 0) return VERDICTS.DIVERGENT_WITH_WIP;
  if (stampOnlyCount > 0) return VERDICTS.DIVERGENT_STAMP_ONLY;

  // Not merged AND no dirty — branch carries unmerged commits but
  // working tree is clean. The audit cannot decide whether the
  // operator wants to merge, abandon, or keep the branch — surface
  // as 'unknown' for manual inspection.
  return VERDICTS.UNKNOWN;
}

/**
 * Basenames of nested worktrees recognized as permanent infrastructure
 * (TPL-315 / ADR-0041). These directories are created and refreshed by
 * external tooling and must never be torn down by R4 cleanup commands.
 *
 * Currently:
 *   - `.cockpit-stable` — Cockpit "run stable version" build cache,
 *     created at `<target-repo>/.cockpit-stable` by
 *     `scripts/cockpit/api-server.mjs` at a stable SHA (detached HEAD).
 *
 * The check is basename-based because the parent repo path varies per
 * install. Keep this list short and explicit — if a new infra pattern
 * appears, add it here AND document it in ADR-0041.
 */
export const KNOWN_INFRA_BASENAMES = Object.freeze(new Set(['.cockpit-stable']));

/**
 * True when `wtPath` resolves to a directory strictly inside `repoRoot`.
 * The repo root itself does NOT count as nested. Cross-platform safe —
 * normalises path separators before comparison.
 */
export function isPathNestedInsideRepo(wtPath, repoRoot) {
  if (!wtPath || !repoRoot) return false;
  const r = resolve(repoRoot).replaceAll('\\', '/');
  const w = resolve(wtPath).replaceAll('\\', '/');
  if (w === r) return false;
  return w.startsWith(`${r}/`);
}

/**
 * True when the basename of `wtPath` is in `KNOWN_INFRA_BASENAMES`.
 */
export function isKnownInfraWorktree(wtPath) {
  if (!wtPath) return false;
  return KNOWN_INFRA_BASENAMES.has(basename(wtPath));
}

/**
 * Map a verdict tag to its one-line operator recommendation. Returns
 * the UNKNOWN recommendation when handed an unrecognized tag, so
 * downstream renderers always have something to print.
 */
export function recommendationFor(verdict) {
  return VERDICT_RECOMMENDATIONS[verdict] ?? VERDICT_RECOMMENDATIONS[VERDICTS.UNKNOWN];
}

/**
 * Convenience predicate — is this verdict eligible for the conservative
 * teardown-stale path? (clean-merged is the only verdict where
 * teardown-stale --execute is safe without first running --refresh.)
 */
export function isEligibleForTeardownStale(verdict) {
  return verdict === VERDICTS.CLEAN_MERGED;
}

/**
 * Convenience predicate — operator-gated extended eligibility for
 * teardown-stale --include-dirty (TPL-312 / ADR-0040). Adds the
 * merged-but-dirty verdicts on top of the conservative set so the
 * operator can bulk-clean accumulated tx-* worktrees that R4's default
 * path correctly preserves. Ancestor-check (merged-only) is still
 * required — unmerged divergent verdicts remain ineligible.
 */
export function isEligibleForTeardownStaleIncludingDirty(verdict) {
  return (
    verdict === VERDICTS.CLEAN_MERGED ||
    verdict === VERDICTS.STALE_MERGED_WITH_WIP ||
    verdict === VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE
  );
}

/**
 * Convenience predicate — does this verdict warrant a refresh step
 * before any teardown decision? Both stamp-only verdicts qualify.
 */
export function isEligibleForRefresh(verdict) {
  return (
    verdict === VERDICTS.STALE_MERGED_WITH_STAMP_RESIDUE ||
    verdict === VERDICTS.DIVERGENT_STAMP_ONLY
  );
}
