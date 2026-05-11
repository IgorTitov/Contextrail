/* @HEADER
 * @version 0.8.11 | 2026-05-11
 * @purpose One-shot R5 rationale-file helper: parse, validate, archive, and delete .coa/r5-override.json.
 * @sidecar r5-override.mjs.header.md
 * @layer lib | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * R5 rationale-file override helper (ADR-0047 / TPL-329, revised TPL-331).
 *
 * consumeOverride(stagedFiles, repoRoot) → { ok, reason?, logEntry?, logPath? }
 *
 * Validates .coa/r5-override.json against the following rules:
 *   - File must exist.
 *   - timestamp must be a valid ISO-8601 string no older than 60 seconds.
 *   - timestamp must not be more than 5 seconds in the future (clock-skew guard).
 *   - category must be in VALID_CATEGORIES.
 *   - When category === 'self-modifying-ceremony', every entry in expected_files
 *     must match at least one CEREMONY_PATH_PATTERNS entry.
 *   - reason must be >= 20 characters.
 *   - expected_files must be an array that fully covers stagedFiles.
 *
 * On acceptance, consumeOverride() is PURE — it builds but does NOT write the log
 * entry or delete the input file. The caller (main-worktree-guard.mjs) is
 * responsible for writing the log file, staging it with `git add`, and then
 * deleting .coa/r5-override.json so the side effects land in the right order.
 *
 * COA_OPERATOR=1 alone does NOT bypass R5. This helper deliberately ignores
 * that env var. See ADR-0047 for the full rationale.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const VALID_CATEGORIES = Object.freeze([
  'self-modifying-ceremony',
  'hotfix-trunk-blocked',
  'docs-only-no-headers',
]);

export const TTL_MS = 60_000;

export const CLOCK_SKEW_TOLERANCE_MS = 5_000;

/**
 * Paths allowed in expected_files when category === 'self-modifying-ceremony'.
 *
 * Extend this list when adding new ceremony scripts. The aggregator audits
 * the log periodically to catch category-files-mismatch violations that
 * slipped through manual override.
 *
 * Note: extend when adding new ceremony scripts; aggregator audits periodically.
 */
export const CEREMONY_PATH_PATTERNS = Object.freeze([
  /^scripts\/coa-[a-z-]+\.mjs$/,
  /^scripts\/lib\/(coa-|transport-branch|r5-override|fs-helpers|worktree-audit|worktree-refresh)/,
  /^scripts\/checks\/(main-worktree-guard|transport-branch-check|test-isolation-check|hook-integrity-check|trunk-integrity-check)\.mjs$/,
  /^\.githooks\/(pre-commit|commit-msg|pre-push|post-commit)$/,
]);

// ---------------------------------------------------------------------------
// consumeOverride
// ---------------------------------------------------------------------------

/**
 * Attempt to validate a one-shot R5 override file.
 *
 * This function is PURE with respect to side effects — it does NOT write,
 * archive, or delete any files. On success it returns the log entry and
 * log path so the caller can perform those operations in the correct order
 * (write log → git add log → delete override file).
 *
 * @param {string[]} stagedFiles  Staged file paths relative to repo root
 * @param {string}   repoRoot     Absolute path to the repository root
 * @returns {{ ok: boolean, reason?: string, logEntry?: object, logPath?: string }}
 */
export function consumeOverride(stagedFiles, repoRoot) {
  const overridePath = join(repoRoot, '.coa', 'r5-override.json');

  if (!existsSync(overridePath)) {
    return { ok: false, reason: 'No .coa/r5-override.json found.' };
  }

  let data;
  try {
    data = JSON.parse(readFileSync(overridePath, 'utf8'));
  } catch (err) {
    return { ok: false, reason: `Failed to parse .coa/r5-override.json: ${err.message}` };
  }

  const { timestamp, slice_id, reason, expected_files, category } = data;

  if (!timestamp || typeof timestamp !== 'string') {
    return { ok: false, reason: 'r5-override.json: missing or invalid "timestamp" field.' };
  }

  const ts = Date.parse(timestamp);
  if (isNaN(ts)) {
    return {
      ok: false,
      reason: `r5-override.json: "timestamp" is not a valid ISO-8601 date: ${timestamp}`,
    };
  }

  // Gap 1 — Far-future timestamp rejection (TPL-331 / ADR-0047 Revision 1).
  // A timestamp more than CLOCK_SKEW_TOLERANCE_MS in the future is rejected
  // to close Vector 3 from the whitehack analysis.
  if (ts > Date.now() + CLOCK_SKEW_TOLERANCE_MS) {
    return { ok: false, reason: 'timestamp-in-future' };
  }

  if (Date.now() - ts > TTL_MS) {
    return {
      ok: false,
      reason:
        'r5-override.json: timestamp is older than 60 seconds (TTL expired). Re-create the file.',
    };
  }

  if (!slice_id || typeof slice_id !== 'string') {
    return { ok: false, reason: 'r5-override.json: missing or invalid "slice_id" field.' };
  }

  if (!reason || typeof reason !== 'string' || reason.length < 20) {
    return {
      ok: false,
      reason: `r5-override.json: "reason" must be >= 20 characters (got ${reason?.length ?? 0}).`,
    };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return {
      ok: false,
      reason: `r5-override.json: "category" must be one of: ${VALID_CATEGORIES.join(', ')}. Got: ${JSON.stringify(category)}`,
    };
  }

  if (!Array.isArray(expected_files)) {
    return { ok: false, reason: 'r5-override.json: "expected_files" must be an array.' };
  }

  // Gap 2 — Category × expected_files correlation (TPL-331 / ADR-0047 Revision 1).
  // When category === 'self-modifying-ceremony', every entry in expected_files
  // must match at least one CEREMONY_PATH_PATTERNS entry.
  if (category === 'self-modifying-ceremony') {
    const offending = expected_files.filter(
      (f) => typeof f === 'string' && !CEREMONY_PATH_PATTERNS.some((p) => p.test(f)),
    );
    if (offending.length > 0) {
      return {
        ok: false,
        reason: `category-files-mismatch: these expected_files do not match ceremony path patterns: ${offending.join(', ')}`,
      };
    }
  }

  const expectedSet = new Set(expected_files);
  const uncovered = stagedFiles.filter((f) => !expectedSet.has(f));
  if (uncovered.length > 0) {
    return {
      ok: false,
      reason: `r5-override.json: staged files not listed in "expected_files": ${uncovered.join(', ')}`,
    };
  }

  // All checks passed — build the log entry. consumed_at is set here, after
  // all validation passes, so pre-created entries with stale consumed_at are
  // harmless audit clutter (Vector V5 defense — ADR-0047 Revision 1 / TPL-331).
  const nowMs = Date.now();
  const safeSliceId = slice_id.replace(/[^a-zA-Z0-9_-]/g, '-');
  const logPath = join(repoRoot, '.coa', 'r5-override-log', `${nowMs}-${safeSliceId}.json`);
  const logEntry = { ...data, consumed_at: new Date(nowMs).toISOString() };

  return { ok: true, logEntry, logPath };
}
