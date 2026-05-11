/* @HEADER
 * @version 0.7.97 | 2026-05-05
 * @purpose CLI check: detect force-push attempts to trunk branches via pre-push refspec ancestry analysis; refuse unless operator override is present (R8.5, TPL-259).
 * @sidecar trunk-integrity-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx trunk-integrity
 * @public false
 * @edit careful
 */

/**
 * Trunk integrity check (R8.5 / TPL-259).
 *
 * Reads git pre-push refspecs from stdin (one line per ref:
 *   <local-ref> <local-sha> <remote-ref> <remote-sha>)
 * and refuses any force-push to a trunk branch unless the operator
 * explicitly overrides via COA_OPERATOR=1 COA_FORCE_TRUNK=1.
 *
 * Force-push detection:
 *   If the remote SHA is not all-zero (branch already exists) and is NOT
 *   an ancestor of the local SHA, the push rewrites history → force-push.
 *   Ancestry tested via `git merge-base --is-ancestor remoteSha localSha`.
 *
 * Operator override:
 *   COA_OPERATOR=1 COA_FORCE_TRUNK=1 — allows the force-push and appends
 *   an audit record to .claims/audit.log for traceability.
 *
 * Flags:
 *   --json       Emit structured JSON output instead of prose
 *
 * Exit codes:
 *   0 — push allowed (no force-push to trunk, or valid operator override)
 *   1 — force-push to trunk detected and no valid override present
 *
 * Called by .githooks/pre-push BEFORE R8.2/R8.1/R8.4 checks (fail-fast).
 * The hook pipes the saved refspec data via stdin:
 *   echo "$REFSPEC_DATA" | node scripts/checks/trunk-integrity-check.mjs
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import {
  parsePushRefspecs,
  isPushToTrunk,
  classifyPush,
  TRUNK_BRANCHES,
  ZERO_SHA,
} from '../lib/trunk-integrity.mjs';

const ROOT = resolve(process.cwd());

// MAIN_ROOT resolves to the main repo root even when pre-push fires from a
// linked worktree, so audit events land in the shared .claims/ (TPL-288).
function resolveMainRepoRoot(worktreeRoot) {
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

const MAIN_ROOT = resolveMainRepoRoot(ROOT);
const AUDIT_LOG = join(MAIN_ROOT, '.claims', 'audit.log');

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
// Ancestry check
// ---------------------------------------------------------------------------

/**
 * Return true when ancestorSha is an ancestor of descendantSha.
 * Uses `git merge-base --is-ancestor` (exit 0 = yes, exit 1 = no).
 */
function isAncestor(ancestorSha, descendantSha) {
  if (!ancestorSha || !descendantSha) return false;
  if (ancestorSha === ZERO_SHA || descendantSha === ZERO_SHA) return true;
  const r = spawnSync('git', ['merge-base', '--is-ancestor', ancestorSha, descendantSha], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return r.status === 0;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

function appendAuditRecord(record) {
  try {
    const claimsDir = join(MAIN_ROOT, '.claims');
    if (!existsSync(claimsDir)) mkdirSync(claimsDir, { recursive: true });
    appendFileSync(AUDIT_LOG, JSON.stringify(record) + '\n', 'utf8');
  } catch {
    // Best-effort — never crash the hook on log failure
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs();
  const jsonMode = args.has('--json');

  // Read refspecs from stdin (fd 0) — works cross-platform (incl. Windows).
  // The pre-push hook saves stdin to $REFSPEC_DATA first, then pipes it here.
  let stdinContent = '';
  try {
    stdinContent = readFileSync(0, 'utf8');
  } catch {
    // stdin not available (e.g., dry-run invocation without piped input)
  }

  const refspecs = parsePushRefspecs(stdinContent);

  // Filter to trunk-bound refspecs only
  const trunkRefspecs = refspecs.filter(rs => isPushToTrunk(rs, TRUNK_BRANCHES));

  if (trunkRefspecs.length === 0) {
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ ok: true, skipped: true, reason: 'no trunk refs in push' }) + '\n');
    } else {
      console.log('[trunk-integrity] OK: no trunk refs in this push.');
    }
    return 0;
  }

  // Check ancestry for each trunk refspec
  const classified = trunkRefspecs.map(refspec => ({
    refspec,
    remoteIsAncestor: isAncestor(refspec.remoteSha, refspec.localSha),
  }));

  const env = {
    COA_OPERATOR: process.env.COA_OPERATOR,
    COA_FORCE_TRUNK: process.env.COA_FORCE_TRUNK,
  };

  const result = classifyPush({ trunkRefspecs: classified, env });

  if (result.allowed && result.operatorOverride) {
    // Operator-gated override — audit the event
    appendAuditRecord({
      ts: new Date().toISOString(),
      event: 'force-trunk-override',
      operator: process.env.USER || process.env.USERNAME || 'unknown',
      refs: result.forcePushRefspecs.map(r => r.remoteRef),
    });

    if (jsonMode) {
      process.stdout.write(JSON.stringify({
        ok: true,
        operatorOverride: true,
        refs: result.forcePushRefspecs.map(r => r.remoteRef),
      }) + '\n');
    } else {
      console.warn('[trunk-integrity] WARN: force-push to trunk allowed via COA_OPERATOR=1 COA_FORCE_TRUNK=1 (audited).');
    }
    return 0;
  }

  if (!result.allowed) {
    if (jsonMode) {
      process.stdout.write(JSON.stringify({
        ok: false,
        denied: true,
        reason: result.deniedReason,
        refs: (result.forcePushRefspecs || []).map(r => r.remoteRef),
      }) + '\n');
    } else {
      console.error('[trunk-integrity] FATAL: ' + result.deniedReason);
      console.error('');
      console.error('To allow this force-push (operator override — audited):');
      console.error('  COA_OPERATOR=1 COA_FORCE_TRUNK=1 git push --force');
      console.error('');
      console.error('Note: configure branch protection on your remote (GitHub / GitLab)');
      console.error('  as the second-layer defense — local hooks can be bypassed with --no-verify.');
    }
    return 1;
  }

  // Normal allowed push
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ ok: true, checked: trunkRefspecs.length }) + '\n');
  } else {
    console.log(`[trunk-integrity] OK: ${trunkRefspecs.length} trunk ref(s) — no force-push detected.`);
  }
  return 0;
}

process.exit(main());
