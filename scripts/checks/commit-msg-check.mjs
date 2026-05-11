/* @HEADER
 * @version 0.8.12 | 2026-05-11
 * @purpose Validate commit message shape (Conventional Commits + project work-item ID + length and body rules) so the .githooks/commit-msg hook stays small and the rules stay testable.
 * @sidecar commit-msg-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFileSync, appendFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findActiveClaimWithSlice, findRecentClaimWithSlice, findCommittedSliceUse } from './claim-check.mjs';
import { validateAndConsumeOverride } from '../lib/rationale-override.mjs';

const _scriptDir = dirname(fileURLToPath(import.meta.url));
// Resolved from script location — invariant regardless of cwd.
const REPO_ROOT = resolve(_scriptDir, '../..');

/**
 * Resolve the main repository root even from a linked git worktree.
 * Mirrors the implementation in scripts/lib/fs-helpers.mjs (TPL-288).
 */
function resolveMainRepoRoot(worktreeRoot = REPO_ROOT) {
  try {
    const r = spawnSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: worktreeRoot,
      encoding: 'utf8',
    });
    const commonDir = (r.stdout || '').trim();
    if (!commonDir) return worktreeRoot;
    const abs = isAbsolute(commonDir) ? commonDir : join(worktreeRoot, commonDir);
    return resolve(dirname(abs));
  } catch {
    return worktreeRoot;
  }
}

// CLAIMS_DIR resolves to the main repo's .claims/ even when the commit-msg
// hook fires from a linked tx-worktree. CLAIMS_DIR env override honoured for
// test fixtures (TPL-288).
const CLAIMS_DIR = process.env.CLAIMS_DIR
  ? resolve(process.env.CLAIMS_DIR)
  : join(resolveMainRepoRoot(), '.claims');

// Window (seconds) within which a completed claim is still treated as coverage.
// Configurable via env to allow test isolation without touching real clock.
const RECENT_WINDOW_S = process.env.COMMIT_MSG_RECENT_WINDOW_S
  ? Number(process.env.COMMIT_MSG_RECENT_WINDOW_S)
  : 60;

export const ALLOWED_TYPES = [
  'feat',
  'fix',
  'docs',
  'test',
  'refactor',
  'chore',
  'perf',
  'build',
  'ci',
  'style',
];

const HEADER_PATTERN = new RegExp(`^(${ALLOWED_TYPES.join('|')})(\\([a-z0-9._/-]+\\))?(!)?: .+`);

// Multi-segment prefix support: matches TPL-001, AIC-DEV-167, RELEASE-Q1-FEAT-008.
// The greedy prefix alternation is anchored by \b on the left so partial
// word matches (e.g. "XAIC-DEV-167") are refused.
// No /g flag: used for .test() and first-.match() extraction only.
const WORK_ITEM_PATTERN = /\b[A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*-\d{3,}/;

const SKIP_PREFIXES = ['Merge', 'Revert', 'Release', 'fixup!', 'squash!'];

const HEADER_MAX_LEN = 100;

/**
 * Pure validator. Returns { ok: boolean, errors: string[] }.
 * Tested directly in tests/unit/commit-msg-check.test.mjs.
 */
export function validateCommitMessage(rawMessage) {
  const errors = [];

  // Strip comment lines (git-added '#' lines) and trailing whitespace.
  const lines = rawMessage.split(/\r?\n/).filter((line) => !line.startsWith('#'));

  // Drop trailing empty lines so body-rule checks are not fooled by editor trailers.
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  if (lines.length === 0 || lines[0].trim() === '') {
    return { ok: false, errors: ['commit message is empty'] };
  }

  const header = lines[0];

  // Skip auto-generated commit shapes (merges, reverts, fixup commits).
  if (SKIP_PREFIXES.some((prefix) => header.startsWith(prefix))) {
    return { ok: true, errors: [] };
  }

  if (!HEADER_PATTERN.test(header)) {
    errors.push(
      `header must match: <type>(<scope>)?: <summary> — allowed types: ${ALLOWED_TYPES.join(', ')}`,
    );
  }

  if (header.length > HEADER_MAX_LEN) {
    errors.push(`header is ${header.length} chars; must be ≤ ${HEADER_MAX_LEN}`);
  }

  if (header.endsWith('.')) {
    errors.push('header must not end with a period');
  }

  // Body rules — only enforced when a body is present.
  if (lines.length > 1) {
    if (lines[1].trim() !== '') {
      errors.push('header and body must be separated by a blank line');
    }
  }

  if (!WORK_ITEM_PATTERN.test(rawMessage)) {
    errors.push('commit message must include at least one project work-item ID like TPL-001');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Extract the FIRST work-item ID from a commit subject line.
 * Returns the ID string (e.g. 'TPL-281') or null if none found.
 *
 * Only the first ID is checked: the primary slice being delivered is listed first;
 * secondary IDs are cross-references that do not require a new acquire (ADR-0025).
 */
export function extractSliceIdFromHeader(header) {
  const match = header.match(WORK_ITEM_PATTERN);
  return match ? match[0] : null;
}

/**
 * Valid categories for slice-ID override files.
 * Narrow whitelist — 'testing' is intentionally included so test suites
 * can exercise the override path without fabricating a real recovery scenario.
 */
export const SLICE_ID_OVERRIDE_CATEGORIES = Object.freeze([
  'legitimate-reuse',
  'history-restoration',
  'testing',
]);

/**
 * Check that the slice ID does not already appear in any subject line in git
 * history (across all branches). If it does, look for a valid
 * .coa/slice-id-override.json as an escape hatch.
 *
 * This check is SEPARATE from the claim-coverage check (checkSliceCoverage).
 * It closes the parallel-dispatch collision class: two agents each created their
 * own claim for the same ID, so the claim check passed for both — but the same
 * ID still landed in trunk twice (TPL-330 / TPL-331 incidents).
 *
 * Returns:
 *   { ok: true, reason: 'no-duplicate' }         — ID not found in history
 *   { ok: true, reason: 'override-accepted' }    — duplicate found but valid override consumed
 *   { ok: false, reason: 'duplicate-slice-id', duplicate: { hash, subject } }
 *   { ok: false, reason: 'override-invalid', detail: string }
 *
 * @param {string} sliceId
 * @param {{ repoRoot?: string, coaDir?: string }} [opts]
 */
export async function checkSliceIdUniqueness(sliceId, opts = {}) {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const coaDir = opts.coaDir ?? join(resolveMainRepoRoot(repoRoot), '.coa');

  // Query git log subject lines only (--format=%s avoids --grep body matches).
  const result = spawnSync(
    'git',
    ['log', '--all', '--format=%H %s'],
    { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' },
  );

  if (result.status !== 0) {
    // Git not available or repo empty — skip the check gracefully.
    return { ok: true, reason: 'no-duplicate' };
  }

  // Search subject lines for the slice ID pattern.
  // Use word-boundary equivalent: look for ID surrounded by non-word chars or
  // at string edges so "TPL-333" doesn't match "XTPL-333".
  const idPattern = new RegExp(`(?<![A-Z0-9])${sliceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Z0-9-])`);
  let duplicate = null;
  for (const line of (result.stdout || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) continue;
    const hash = trimmed.slice(0, spaceIdx).trim();
    const subject = trimmed.slice(spaceIdx + 1).trim();
    if (idPattern.test(subject)) {
      duplicate = { hash: hash.slice(0, 8), subject };
      break;
    }
  }

  if (!duplicate) {
    return { ok: true, reason: 'no-duplicate' };
  }

  // Duplicate found — check for a file-based override.
  const overridePath = join(coaDir, 'slice-id-override.json');
  const overrideLogDir = join(coaDir, 'slice-id-override-log');
  const overrideResult = validateAndConsumeOverride(overridePath, sliceId, {
    configKey: 'slice_id',
    categoryWhitelist: SLICE_ID_OVERRIDE_CATEGORIES,
    logDir: overrideLogDir,
  });

  if (!overrideResult.valid) {
    return {
      ok: false,
      reason: 'duplicate-slice-id',
      duplicate,
      overrideReason: overrideResult.reason,
    };
  }

  // Override valid — archive the log entry and delete the override file.
  mkdirSync(overrideLogDir, { recursive: true });
  writeFileSync(overrideResult.logPath, JSON.stringify(overrideResult.logEntry, null, 2), 'utf8');
  try {
    unlinkSync(overridePath);
  } catch {
    // If delete fails, treat as non-fatal (file may have been cleaned up already).
  }

  return { ok: true, reason: 'override-accepted', duplicate };
}

/**
 * Verify that the given slice ID is covered by an active claim, a recently-
 * completed claim, or an explicitly-overridden history match. Returns { ok, reason, info }.
 *
 * Priority order (TPL-299 / ADR-0031 — tightened from ADR-0030):
 *   Layer 0: dual-key operator override (COA_OPERATOR=1 + COMMIT_MSG_ALLOW_ORPHAN_SLICE=1)
 *   Layer 1: active claim
 *   Layer 1.5: recently-completed claim (within RECENT_WINDOW_S seconds)
 *   Layer 2: prior commit in history AND dual-key history override
 *             (COA_OPERATOR=1 + COMMIT_MSG_ALLOW_HISTORY_MATCH=1) → history-fixup-override
 *   else: orphan
 *
 * History-match silent INFO pass removed (TPL-299): subject-level reuse via history
 * allowed two unrelated commits to share the same slice ID (TPL-288, ZVX-DEV-111).
 *
 * @param {string} sliceId
 * @param {{ claimsDir?: string, repoRoot?: string, env?: NodeJS.ProcessEnv, windowSeconds?: number }} [opts]
 */
export async function checkSliceCoverage(sliceId, opts = {}) {
  const claimsDir = opts.claimsDir ?? CLAIMS_DIR;
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const env = opts.env ?? process.env;
  const windowSeconds = opts.windowSeconds
    ?? (env.COMMIT_MSG_RECENT_WINDOW_S ? Number(env.COMMIT_MSG_RECENT_WINDOW_S) : RECENT_WINDOW_S);

  // Layer 0: dual-key operator override: both keys must be set.
  if (env.COA_OPERATOR === '1' && env.COMMIT_MSG_ALLOW_ORPHAN_SLICE === '1') {
    return { ok: true, reason: 'operator-override', info: null };
  }

  // Layer 1: active claim with matching slice field.
  const activeClaim = await findActiveClaimWithSlice(sliceId, claimsDir);
  if (activeClaim) {
    return { ok: true, reason: 'active-claim', info: activeClaim };
  }

  // Layer 1.5: recently-completed claim — handles pre-commit auto-complete
  // running before commit-msg hook fires (TPL-293 / ADR-0030).
  const recentResult = await findRecentClaimWithSlice(sliceId, claimsDir, windowSeconds);
  if (recentResult && recentResult.reason === 'completed-recently') {
    return { ok: true, reason: 'recently-completed', info: recentResult.claim };
  }

  // Layer 2: prior commit in history — requires explicit dual-key operator override.
  // Default (no override): history match → orphan, closing subject-reuse collision class
  // observed in TPL-288 (dual commit with same subject ID) and ZVX-DEV-111 (same incident
  // in Zvenix). Single-key COMMIT_MSG_ALLOW_HISTORY_MATCH=1 without COA_OPERATOR is refused.
  const historyMatch = await findCommittedSliceUse(sliceId, repoRoot);
  if (historyMatch) {
    if (env.COA_OPERATOR === '1' && env.COMMIT_MSG_ALLOW_HISTORY_MATCH === '1') {
      // Write an audit log entry before approving — atomicity: if append throws, the
      // commit is refused (the exception propagates to main() → exit 2).
      const auditEntry = JSON.stringify({
        ts: new Date().toISOString(),
        event: 'commit-msg-history-fixup-override',
        slice: sliceId,
        matched_commit: historyMatch.hash,
        subject: historyMatch.subject,
        operator_override_active: true,
      });
      appendFileSync(join(claimsDir, 'audit.log'), auditEntry + '\n', 'utf8');
      return { ok: true, reason: 'history-fixup-override', info: historyMatch };
    }
    // History match exists but no operator override — refuse.
    return { ok: false, reason: 'slice-id-orphan', info: null };
  }

  return { ok: false, reason: 'slice-id-orphan', info: null };
}

// CLI entry point. Argument is the path to the commit message file.
async function main() {
  const messageFile = process.argv[2];
  if (!messageFile) {
    console.error('usage: commit-msg-check.mjs <commit-msg-file>');
    process.exit(2);
  }

  let raw;
  try {
    raw = readFileSync(messageFile, 'utf8');
  } catch (error) {
    console.error(`commit-msg-check: cannot read ${messageFile}: ${error.message}`);
    process.exit(2);
  }

  const result = validateCommitMessage(raw);
  if (!result.ok) {
    console.error('commit-msg-check: FAIL');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  // Slice-coverage check (CG-C4-1 / ADR-0025 / TPL-281).
  // Strip comment lines before extracting header, matching validateCommitMessage's pre-processing.
  const lines = raw.split(/\r?\n/).filter((line) => !line.startsWith('#'));
  const header = lines[0] ?? '';

  // Skip auto-generated shapes — same guard as validateCommitMessage.
  if (!SKIP_PREFIXES.some((prefix) => header.startsWith(prefix))) {
    const sliceId = extractSliceIdFromHeader(header);
    if (sliceId) {
      // Slice-ID uniqueness check (TPL-333 / ADR-0049).
      // Runs before the claim-coverage check so that two parallel sessions that
      // each hold a valid claim for the same ID cannot both land in trunk.
      const uniqueness = await checkSliceIdUniqueness(sliceId);
      if (!uniqueness.ok) {
        const { duplicate, overrideReason } = uniqueness;
        console.error('[commit-msg-check] FAIL: duplicate-slice-id');
        console.error(`  slice ${sliceId} already exists in git history (commit ${duplicate.hash}: "${duplicate.subject}").`);
        if (overrideReason && !overrideReason.startsWith('No override file found')) {
          console.error(`  Override rejected: ${overrideReason}`);
        }
        console.error('');
        console.error('  Recovery:');
        console.error('    Pick a higher ID (use `coa-worktree --create` without --slice= for auto-pick),');
        console.error('    or provide .coa/slice-id-override.json if this reuse is legitimate.');
        console.error('    See docs/guides/slice-id-override-emergency.md for format and valid categories.');
        process.exit(1);
      }
      if (uniqueness.reason === 'override-accepted') {
        console.warn(
          `[commit-msg-check] WARN: slice ${sliceId} already in history (${uniqueness.duplicate.hash}) — slice-id-override consumed, log archived`,
        );
      }

      const coverage = await checkSliceCoverage(sliceId);
      if (!coverage.ok) {
        console.error('[commit-msg-check] FAIL: slice-id-orphan');
        console.error(`  Slice ID in subject: ${sliceId}`);
        console.error(
          `  No active claim with this slice (run \`node scripts/coa-worktree.mjs --create --slice=${sliceId}\` first)`,
        );
        console.error('');
        console.error('  Recovery:');
        console.error('    1. Cancel this commit');
        console.error(
          `    2. Run: node scripts/coa-worktree.mjs --create --slice=${sliceId}`,
        );
        console.error('    3. Work in the resulting tx- worktree, then coa-merge');
        console.error('    OR');
        console.error(
          '    If this is a fixup of a prior commit using the SAME slice ID in subject:',
        );
        console.error(
          '    4. Set COA_OPERATOR=1 COMMIT_MSG_ALLOW_HISTORY_MATCH=1 and re-run git commit',
        );
        console.error('       (audit log entry will be written; prefer a NEW slice ID instead)');
        process.exit(1);
      }
      if (coverage.reason === 'history-fixup-override') {
        const { hash, subject } = coverage.info;
        console.warn(
          `[commit-msg-check] WARN: slice ${sliceId} found in prior commit ${hash} ("${subject}") — history-fixup-override active, audit log written`,
        );
      }
    }
  }
}

// Only run main when invoked directly, not when imported by tests.
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('commit-msg-check.mjs')
) {
  main().catch((err) => {
    console.error(`commit-msg-check: unexpected error: ${err.message}`);
    process.exit(2);
  });
}
