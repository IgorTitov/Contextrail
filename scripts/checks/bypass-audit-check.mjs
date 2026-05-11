/* @HEADER
 * @version 0.7.70 | 2026-05-03
 * @purpose CLI check: scan recent commits for matching phases-ran audit records; flag commits made via --no-verify or with missing NON_SKIPPABLE phases.
 * @sidecar bypass-audit-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx bypass-audit
 * @public false
 * @edit careful
 */

/**
 * Bypass audit check (R8.4 / TPL-258).
 *
 * Default mode: scan the last N commits (default 20), read
 * .claims/commit-audit.log, and flag any commit that has no matching
 * phases-ran record (indicates git commit --no-verify) or has a record that
 * is missing NON_SKIPPABLE_PHASES (indicates tampered hook bypassing a
 * required phase).
 *
 * Called by .githooks/pre-push so bypass commits are caught before they
 * reach a shared remote. The audit log is operator-local and gitignored
 * (.claims/commit-audit.log).
 *
 * Flags:
 *   --recent=<N>      Override default commit count (default 20)
 *   --json            Emit structured JSON output instead of prose
 *   --warn-only       Exit 0 even when gaps are found (for stabilisation)
 *
 * Exit codes:
 *   0 — all recent commits have complete audit records (or --warn-only)
 *   1 — one or more commits have missing/incomplete records
 *
 * Recovery options when flagged:
 *   Bypass commit (no record):   Run pnpm mergezip from main and re-push,
 *                                or re-do the commit through the normal hook
 *                                chain, or accept the gap and push with
 *                                --no-verify (documents the bypass explicitly).
 *   Log not found (new machine): The audit log is operator-local. On a fresh
 *                                clone, bypass-audit-check skips the scan
 *                                automatically (no log = no local history to
 *                                validate). Pull the branch and run commits
 *                                normally to build up the log.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseAuditLog, correlateCommitsToPhases } from '../lib/bypass-audit.mjs';

const ROOT = resolve(process.cwd());
const AUDIT_LOG = join(ROOT, '.claims', 'commit-audit.log');

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv = process.argv.slice(2)) {
  const map = new Map();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) map.set(arg.slice(0, eq), arg.slice(eq + 1));
    else map.set(arg, true);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

/**
 * Get the last N commit SHAs from git log.
 * Returns an empty array if git is unavailable or the repo has no commits.
 */
function getRecentCommits(n) {
  const r = spawnSync('git', ['log', `--pretty=format:%H`, `-${n}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0 || !r.stdout.trim()) return [];
  return r.stdout.trim().split('\n').filter(Boolean);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs();
  const recent = parseInt(args.get('--recent') || '20', 10);
  const jsonMode = args.has('--json');
  const warnOnly = args.has('--warn-only');

  // If there is no audit log at all, we are on a fresh clone or the log has
  // never been written (pre-TPL-258 history). Skip gracefully — there is
  // nothing to validate.
  if (!existsSync(AUDIT_LOG)) {
    if (jsonMode) {
      process.stdout.write(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'no audit log found (fresh clone or pre-R8.4 history)',
          gaps: [],
          incomplete: [],
        }) + '\n',
      );
    } else {
      console.log(
        '[bypass-audit] No audit log found — skipping check (fresh clone or pre-R8.4 history).',
      );
    }
    return 0;
  }

  const commits = getRecentCommits(recent);
  if (commits.length === 0) {
    if (jsonMode) {
      process.stdout.write(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'no commits found',
          gaps: [],
          incomplete: [],
        }) + '\n',
      );
    } else {
      console.log('[bypass-audit] No commits found — nothing to check.');
    }
    return 0;
  }

  const records = parseAuditLog(AUDIT_LOG);
  const { matched, gaps, incomplete } = correlateCommitsToPhases(commits, records);
  const ok = gaps.length === 0 && incomplete.length === 0;

  if (jsonMode) {
    process.stdout.write(
      JSON.stringify({
        ok,
        checked: commits.length,
        matched: matched.length,
        gaps: gaps.map((sha) => ({ sha, issue: 'no-audit-record' })),
        incomplete: incomplete.map(({ sha, missing }) => ({
          sha,
          issue: 'missing-non-skippable',
          missing,
        })),
      }) + '\n',
    );
  } else if (!ok) {
    console.error('[bypass-audit] FAIL: commit(s) found with missing or incomplete audit records.');
    for (const sha of gaps) {
      console.error(
        `  BYPASS: ${sha.slice(0, 12)} — no audit record (likely git commit --no-verify)`,
      );
    }
    for (const { sha, missing } of incomplete) {
      console.error(
        `  INCOMPLETE: ${sha.slice(0, 12)} — missing NON_SKIPPABLE phases: ${missing.join(', ')}`,
      );
    }
    console.error('');
    console.error('Recovery:');
    console.error('  1. Re-do the commit(s) through the normal hook chain to build audit records');
    console.error(
      '  2. Or accept the gap: re-push with git push --no-verify (documents bypass explicitly)',
    );
  } else {
    console.log(
      `[bypass-audit] OK: ${matched.length}/${commits.length} recent commit(s) have complete audit records.`,
    );
  }

  if (!ok && !warnOnly) return 1;
  return 0;
}

process.exit(main());
