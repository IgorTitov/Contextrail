/* @HEADER
 * @version 0.8.8 | 2026-05-11
 * @purpose Claim-check script for inter-agent coordination. Reads .claims/*.json, detects overlaps, enforces conflicts, manages stale claims, supports negotiation protocol, dependency-aware ordering, cross-repo federation, active-claim queries, pessimistic --acquire mode, shared-infra protection, self-staged claim filtering for pre-commit accuracy, --force-expire authorization (TPL-221), same-agent --extend (TPL-222), structured cross-agent abandoned-check before --force-expire fires (TPL-225), append-only .claims/audit.log emitting create/extend/force-expire events, slice-ID uniqueness invariant (C4, TPL-282), and frozen-paths subset (R11, TPL-317) — --acquire stores --frozen=<csv> on the claim, --enforce --staged refuses staged frozen-list intersections, --query / --audit surface frozen status, two-factor operator override mirrors ADR-0041.
 * @sidecar claim-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Claim-check script for inter-agent coordination.
 *
 * Modes:
 *   --targets=<file,...> --action=<extend|modify|replace>  Check for overlaps
 *   --staged                                               Use git staged files as targets
 *   --enforce                                              Exit 1 on blocking conflicts
 *   --auto-expire                                          Write "expired" to stale claims
 *   --prune                                                Delete completed/expired/abandoned claim files
 *   --clean-expired [--dry-run] [--keep-completed-days=N]  Operator-gated cleanup: deletes status=expired
 *                                                            immediately and status=completed older than N
 *                                                            days (default 30). Audit log entry per file.
 *                                                            Requires COA_OPERATOR=1. (TPL-309)
 *   --query=<path>                                         Show active claims on a file
 *   --audit                                                Report stale/expired claims + last 50 audit log entries
 *   --create --agent=<n> --slice=<id> --targets=<paths>    Create a new claim file
 *   --acquire --agent=<n> --slice=<id> --targets=<paths>   Atomic check+create (fails on conflict)
 *           [--allow-id-collision]                          (C4/TPL-282 — bypass requires COA_OPERATOR=1)
 *   --extend --id=<claim-id> --agent=<your-agent>          Append new targets to an active claim
 *           --add-targets=<comma-list> [--action=<a>]       (TPL-222 — same-agent only; auto-extends
 *                                                            ceremony+regen paths from coa-merge)
 *   --auto-complete --staged [--agent=<n>]                 Complete claims whose targets are staged
 *   --force-expire --id=<claim-id> --agent=<your-agent>    Expire a specific claim (auth-gated; see below)
 *           [--really] [--reason="<text>"]
 *           [--operator-confirmed]                          (TPL-225 — cross-agent escape;
 *                                                            requires COA_OPERATOR=1 env)
 *   --federated=<dir>                                      Load claims from external directory
 *   --json                                                 Machine-readable output
 *
 * --force-expire authorization model (TPL-221 + TPL-225):
 *   Same-agent default — caller must self-identify with --agent matching claim.agent.
 *   Cross-agent escape — requires both --really and a non-empty --reason.
 *   Young-claim guard — claims younger than MIN_FORCE_EXPIRE_AGE_MINUTES require --really
 *                        even from the same agent.
 *   Abandoned-check (TPL-225) — every cross-agent override now also runs
 *                        checkClaimAbandoned (age + git activity + stash signals).
 *                        confidence=high → succeeds; confidence=medium/low →
 *                        requires --operator-confirmed AND COA_OPERATOR=1.
 *   Audit log — every force-expire writes a JSON Lines event to .claims/audit.log.
 *               Cross-agent events embed the abandonedCheck signals + tier so
 *               an operator can reconstruct the decision facts later.
 *               Cross-agent rejections by the abandoned-check write a
 *               'force-expire-rejected' event with rejectionReason.
 *               --acquire and --create also emit symmetric "create" events.
 */

import { readdir, readFile, writeFile, unlink as unlinkFile, appendFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, result, ROOT, resolveMainRepoRoot } from './_shared.mjs';

// CLAIMS_DIR resolves to the main repo's .claims/ even when claim-check is
// invoked from a linked git worktree (tx-<slice>). CLAIMS_DIR env override
// is honoured for test fixtures that need an isolated claims directory.
const CLAIMS_DIR = process.env.CLAIMS_DIR
  ? resolve(process.env.CLAIMS_DIR)
  : join(resolveMainRepoRoot(), '.claims');

// SCRIPT_ROOT is the actual repository root resolved from this file's location.
// Unlike ROOT (= process.cwd(), caller-controlled), SCRIPT_ROOT is invariant
// regardless of cwd — critical for findCommittedSliceUse which must always
// search the live repo's git history. (TPL-282 / C4)
const _scriptDir = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const SCRIPT_ROOT = resolve(_scriptDir, '../..');
const AUDIT_LOG_FILE = 'audit.log';

// Default window for the acquire-time recently-completed Layer 1.5 check
// (TPL-308 / ADR-0036). Mirrors COMMIT_MSG_RECENT_WINDOW_S from TPL-298 /
// ADR-0030. Closes the race window between pre-commit --auto-complete (which
// flips claim.status → 'completed' before commit-msg fires) and the moment
// the commit lands on HEAD: during that gap, both the active-claim check and
// the git-log history check return null, allowing a parallel session's
// auto-pick to choose the same slice ID. See ADR-0036 for the diagnosis.
const ACQUIRE_RECENT_WINDOW_S = process.env.CLAIM_ACQUIRE_RECENT_WINDOW_S
  ? Number(process.env.CLAIM_ACQUIRE_RECENT_WINDOW_S)
  : 60;

// ---------------------------------------------------------------------------
// Pure functions (exported for unit testing)
// ---------------------------------------------------------------------------

/** Maximum TTL in hours — claims beyond this are capped. */
export const MAX_TTL_HOURS = 168; // 7 days

/** Maximum number of targets per claim. */
export const MAX_TARGETS = 100; // unified across Template, Cockpit, Zvenix per TPL-330 — absorbs Phase 5 + agent-contract regen residue for wide slices while staying a sanity threshold

/**
 * Minimum claim age (in minutes) below which `--force-expire` requires the
 * `--really` flag even when the caller is the claim's own agent. Guards
 * against fat-fingered self-override of an in-flight claim.
 *
 * Field-finding-008 incident: a 1-2 minute old live claim was wiped by a
 * sibling session in seconds with no audit trail. Anything younger than
 * 5 minutes is, by definition, in-flight work.
 */
export const MIN_FORCE_EXPIRE_AGE_MINUTES = 5;

/** Allowed strategy values. */
export const VALID_STRATEGIES = new Set(['bba-additive', 'modify-in-place', 'negotiate']);

/** Allowed target action values. */
export const VALID_ACTIONS = new Set(['extend', 'modify', 'replace']);

/**
 * ID prefix for tracked example claims. Files with this prefix in their ID
 * are documentation examples (clm-ex0001..3 in `.claims/`) and must not be
 * pruned by `--prune` even when their status is completed/expired/abandoned.
 */
export const EXAMPLE_CLAIM_ID_PREFIX = 'clm-ex';

/**
 * Predicate: is this claim a tracked example (documentation), not an
 * operational claim filed by an agent? Used to spare example files from
 * `--prune` and any future bulk operations.
 */
export function isExampleClaim(claim) {
  return typeof claim?.id === 'string' && claim.id.startsWith(EXAMPLE_CLAIM_ID_PREFIX);
}

// TPL-317 — frozen-paths override. Two-factor: COA_OPERATOR=1 + a commit-msg
// body line starting with `Allow-frozen-write:` followed by a reason of
// >= FROZEN_MIN_REASON_LEN non-whitespace chars. Mirrors the test-deletion-guard
// override (R9 / ADR-0041) for cross-script consistency.
export const FROZEN_OVERRIDE_LINE_RE = /^Allow-frozen-write:\s*(\S.*)$/m;
export const FROZEN_MIN_REASON_LEN = 3;

/**
 * Pull the operator-override reason from a commit-message body. Returns null
 * when the line is missing or its reason is shorter than FROZEN_MIN_REASON_LEN
 * after trimming. Pure function — no I/O.
 */
export function extractFrozenOverrideReason(commitMsg) {
  if (typeof commitMsg !== 'string' || commitMsg.length === 0) return null;
  const m = commitMsg.match(FROZEN_OVERRIDE_LINE_RE);
  if (!m) return null;
  const reason = m[1].trim();
  if (reason.length < FROZEN_MIN_REASON_LEN) return null;
  return reason;
}

/**
 * Compute the intersection between a staged file set and every active claim's
 * `frozen` paths list. Legacy claims without a `frozen` field are skipped
 * entirely (backwards-compatibility guarantee — TPL-317 / ADR-0043). Returns
 * an array of `{ path, claimId, slice, agent }` violations; empty array means
 * no violations.
 */
export function checkFrozenPathsViolations(stagedFiles, activeClaims) {
  const violations = [];
  if (!Array.isArray(stagedFiles) || stagedFiles.length === 0) return violations;
  if (!Array.isArray(activeClaims) || activeClaims.length === 0) return violations;
  const normStaged = new Set(stagedFiles.map((f) => String(f).replaceAll('\\', '/')));
  for (const claim of activeClaims) {
    if (!claim || claim.status !== 'active') continue;
    const frozen = Array.isArray(claim.frozen) ? claim.frozen : [];
    if (frozen.length === 0) continue;
    for (const raw of frozen) {
      const norm = String(raw).replaceAll('\\', '/');
      if (normStaged.has(norm)) {
        violations.push({
          path: norm,
          claimId: claim.id,
          slice: claim.slice,
          agent: claim.agent,
        });
      }
    }
  }
  return violations;
}

/**
 * JSON.parse reviver that strips __proto__ keys to prevent prototype pollution.
 */
export function safeJsonReviver(key, value) {
  return key === '__proto__' ? undefined : value;
}

/**
 * Validate that a target path is safe (no traversal, no absolute paths).
 * Returns true if the path is valid, false otherwise.
 */
export function isValidTargetPath(p) {
  const s = String(p);
  if (s.includes('..')) return false;
  if (s.startsWith('/')) return false;
  if (/\\(?!\\)/.test(s) && s.includes('..')) return false; // backslash-escaped sequences with traversal
  return true;
}

/**
 * Parse a claim JSON string. Returns the parsed object or null if invalid.
 * Applies proto-pollution guard, schema validation, TTL cap, and path checks.
 */
export function parseClaim(text, filename) {
  try {
    const claim = JSON.parse(text, safeJsonReviver);
    if (!claim.id || !claim.status) return null;

    // Validate strategy enum (if present)
    if (claim.strategy && !VALID_STRATEGIES.has(claim.strategy)) return null;

    // Validate targets
    const targets = Array.isArray(claim.targets) ? claim.targets : [];
    if (targets.length > MAX_TARGETS) return null;
    for (const t of targets) {
      if (t.action && !VALID_ACTIONS.has(t.action)) return null;
      if (t.path && !isValidTargetPath(t.path)) return null;
    }

    // Cap TTL: if expires is more than MAX_TTL_HOURS after created, cap it
    if (claim.created && claim.expires) {
      const created = new Date(claim.created);
      const expires = new Date(claim.expires);
      const maxExpires = new Date(created.getTime() + MAX_TTL_HOURS * 60 * 60 * 1000);
      if (expires > maxExpires) {
        claim.expires = maxExpires.toISOString();
      }
    }

    claim._file = filename;
    return claim;
  } catch {
    return null;
  }
}

/**
 * Filter claims to only active ones within TTL.
 */
export function filterActiveClaims(claims, now = new Date()) {
  return claims.filter((c) => {
    if (c.status !== 'active') return false;
    const expires = new Date(c.expires);
    return expires >= now;
  });
}

/**
 * Find the first active claim whose `slice` field matches sliceId.
 * Called inside the acquireLock region so the freshClaims snapshot is current.
 * Pure — does not write.
 *
 * @param {string} sliceId  - slice ID to look for (e.g. 'TPL-282')
 * @param {string} claimsDir - directory containing clm-*.json files
 * @returns {Promise<object|null>} first matching active claim, or null
 */
export async function findActiveClaimWithSlice(sliceId, claimsDir) {
  let files;
  try {
    files = await readdir(claimsDir);
  } catch {
    return null;
  }
  const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('config'));
  for (const f of jsonFiles) {
    const text = await readFile(join(claimsDir, f), 'utf8').catch(() => '');
    const claim = parseClaim(text, f);
    if (!claim) continue;
    if (claim.status === 'active' && claim.slice === sliceId) {
      const now = new Date();
      const expires = new Date(claim.expires);
      if (expires >= now) return claim;
    }
  }
  return null;
}

/**
 * Find the first claim whose `slice` field matches sliceId and that is either:
 *   (a) active, OR
 *   (b) completed within the last `windowSeconds` seconds.
 *
 * Case (b) exists because pre-commit's --auto-complete fires BEFORE commit-msg,
 * so the claim is already completed by the time commit-msg-check validates the
 * slice ID. completed_at is written by --auto-complete (TPL-293 / ADR-0030).
 * Falls back to file mtime when completed_at is absent (legacy claims).
 *
 * @param {string} sliceId
 * @param {string} claimsDir
 * @param {number} [windowSeconds=60]
 * @returns {Promise<{claim: object, reason: 'active'|'completed-recently'}|null>}
 */
export async function findRecentClaimWithSlice(sliceId, claimsDir, windowSeconds = 60) {
  let files;
  try {
    files = await readdir(claimsDir);
  } catch {
    return null;
  }
  const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('config'));
  const windowMs = windowSeconds * 1000;
  const now = Date.now();

  for (const f of jsonFiles) {
    const filePath = join(claimsDir, f);
    const text = await readFile(filePath, 'utf8').catch(() => '');
    const claim = parseClaim(text, f);
    if (!claim || claim.slice !== sliceId) continue;

    if (claim.status === 'active') {
      const expires = new Date(claim.expires);
      if (expires >= new Date()) return { claim, reason: 'active' };
    }

    if (claim.status === 'completed') {
      let completedMs;
      if (claim.completed_at) {
        completedMs = new Date(claim.completed_at).getTime();
      } else {
        // Legacy claims written before TPL-293 lack completed_at; use file mtime.
        try {
          const { statSync } = await import('node:fs');
          completedMs = statSync(filePath).mtimeMs;
        } catch {
          continue;
        }
      }
      if (!Number.isNaN(completedMs) && now - completedMs <= windowMs) {
        return { claim, reason: 'completed-recently' };
      }
    }
  }
  return null;
}

/**
 * Search `git log --all` for commits whose subject line contains `(sliceId)`.
 * Uses spawnSync (NOT execSync — R1 anti-evasion).
 * Escapes parentheses in sliceId for the --grep pattern.
 * Returns `{ hash, subject }` of first match, or null.
 *
 * @param {string} sliceId  - slice ID to search (e.g. 'TPL-282')
 * @param {string} repoRoot - absolute path to the git repository root
 * @returns {Promise<{hash: string, subject: string}|null>}
 */
export async function findCommittedSliceUse(sliceId, repoRoot) {
  // Escape special regex characters in sliceId for use with --grep
  const escapedId = sliceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const result = spawnSync('git', ['log', '--all', '--oneline', `--grep=(${escapedId})`], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0 || !result.stdout) return null;
  const firstLine = result.stdout.split('\n').find((l) => l.trim().length > 0);
  if (!firstLine) return null;
  const spaceIdx = firstLine.indexOf(' ');
  if (spaceIdx === -1) return null;
  const hash = firstLine.slice(0, spaceIdx).trim();
  const subject = firstLine.slice(spaceIdx + 1).trim();
  return { hash, subject };
}

/**
 * Extract module name from a file path.
 * "modules/auth/public-api.mjs" -> "auth"
 */
function moduleFromPath(filePath) {
  const posix = String(filePath).replaceAll('\\', '/');
  const match = posix.match(/^modules\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Detect overlaps between active claims and intended targets.
 *
 * Returns an array of overlap objects with severity:
 * - "advisory"  — both actions are extend (additive, low risk)
 * - "nearby"    — same module but different file
 * - "conflict"  — same file, at least one is modify/replace
 *
 * `selfStagedFiles` (optional) — when supplied, any active claim whose targets
 * intersect this set is treated as authorizing the committer's own work and is
 * skipped from overlap reporting. This is what `--enforce --staged` passes so
 * that the committer's own claim does not register as a third-party conflict
 * while genuine cross-session conflicts continue to be detected. Default
 * behaviour (null/undefined) is byte-identical to the unfiltered case.
 */
export function detectOverlaps(
  activeClaims,
  targetPaths,
  intendedAction,
  protectedPaths,
  selfStagedFiles,
) {
  // Default to the canonical protected paths list if not provided
  if (!protectedPaths) {
    protectedPaths = ['VERSION', 'CHANGELOG.md', 'package.json'];
  }
  const overlaps = [];
  const targetSet = new Set(targetPaths.map((p) => p.replaceAll('\\', '/')));
  const targetModules = new Set(targetPaths.map(moduleFromPath).filter(Boolean));
  const selfStagedSet = selfStagedFiles
    ? new Set(selfStagedFiles.map((f) => String(f).replaceAll('\\', '/')))
    : null;

  for (const claim of activeClaims) {
    const targets = Array.isArray(claim.targets) ? claim.targets : [];
    // Self-staged filter: if any of this claim's targets is in the committer's
    // staged set, the claim authorizes the current commit — skip it entirely.
    if (selfStagedSet) {
      const authorizes = targets.some((ct) =>
        selfStagedSet.has(String(ct.path).replaceAll('\\', '/')),
      );
      if (authorizes) continue;
    }
    const isBroad = targets.length > 5;

    for (const ct of targets) {
      const claimPath = String(ct.path).replaceAll('\\', '/');
      const claimModule = ct.module || moduleFromPath(claimPath);
      const claimAction = ct.action || 'extend';

      // Exact file overlap
      if (targetSet.has(claimPath)) {
        const bothExtend = claimAction === 'extend' && intendedAction === 'extend';
        // Escalate extend+extend to conflict on protected paths (VERSION, CHANGELOG, package.json).
        // Two sessions cannot safely extend these files simultaneously — last writer wins.
        const isProtected = protectedPaths.some(
          (pp) => claimPath === pp || claimPath.endsWith('/' + pp),
        );
        const severity = bothExtend && !isProtected ? 'advisory' : 'conflict';
        overlaps.push({
          claimId: claim.id,
          agent: claim.agent,
          slice: claim.slice,
          path: claimPath,
          claimAction,
          intendedAction,
          severity,
          broad: isBroad,
          description: ct.description,
        });
      }
      // Same module, different file
      else if (claimModule && targetModules.has(claimModule)) {
        overlaps.push({
          claimId: claim.id,
          agent: claim.agent,
          slice: claim.slice,
          path: claimPath,
          claimAction,
          intendedAction,
          severity: 'nearby',
          broad: isBroad,
          description: ct.description,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Check whether any overlap has blocking conflict severity.
 * Used by --enforce mode to decide exit code.
 */
export function hasBlockingConflicts(overlaps) {
  return overlaps.some((o) => o.severity === 'conflict');
}

/**
 * Return a new claim object with status set to "expired".
 * Does not mutate the original. Strips internal _file field.
 */
export function markClaimExpired(claim) {
  const { _file: _discarded, ...rest } = claim;
  return { ...rest, status: 'expired' };
}

/**
 * Compute the age of a claim in seconds (now - created).
 * Returns 0 when `created` is missing or unparseable so the caller can
 * still produce a deterministic event without crashing on a malformed
 * claim. Negative values (claim created in the future relative to now)
 * are clamped to 0 — they always pass the young-claim guard.
 */
export function claimAgeSeconds(claim, now = new Date()) {
  if (!claim || !claim.created) return 0;
  const created = new Date(claim.created);
  if (Number.isNaN(created.getTime())) return 0;
  const ms = now.getTime() - created.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 1000);
}

/**
 * Decide whether a `--force-expire` request is allowed under the authorization
 * model (TPL-221). Pure function — no I/O, no audit-log side effects.
 *
 * Layers (each subsumes the prior):
 *   A. Same-agent default — `callerAgent` must match `claim.agent`. Caller must
 *      self-identify; an empty/missing callerAgent is rejected.
 *   B. Cross-agent escape — when callerAgent !== claim.agent, both `hasReally`
 *      and a non-empty `reason` are required.
 *   C. Young-claim guard — claims younger than MIN_FORCE_EXPIRE_AGE_MINUTES
 *      require `hasReally` even from the same agent.
 *
 * Returns `{ allowed, error?, classification, ageSeconds }` where classification
 * is one of `'self'`, `'cross-agent'`, `'young-claim-override'` and is set even
 * on rejection so callers can log the attempted classification.
 */
export function validateForceExpireRequest({ claim, callerAgent, hasReally, reason, now } = {}) {
  if (!claim) {
    return {
      allowed: false,
      error: 'claim not found',
      classification: null,
      ageSeconds: 0,
    };
  }

  const ageSeconds = claimAgeSeconds(claim, now || new Date());
  const isYoung = ageSeconds < MIN_FORCE_EXPIRE_AGE_MINUTES * 60;

  // Layer A: caller must self-identify.
  const trimmedCaller = typeof callerAgent === 'string' ? callerAgent.trim() : '';
  if (!trimmedCaller) {
    return {
      allowed: false,
      error: '--agent=<your-agent> is required (caller must self-identify)',
      classification: null,
      ageSeconds,
    };
  }

  const sameAgent = trimmedCaller === claim.agent;
  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

  if (!sameAgent) {
    // Layer B: cross-agent requires --really + --reason.
    if (!hasReally) {
      return {
        allowed: false,
        error: `cross-agent force-expire requires --really (claim agent: ${claim.agent}, caller: ${trimmedCaller})`,
        classification: 'cross-agent',
        ageSeconds,
      };
    }
    if (!trimmedReason) {
      return {
        allowed: false,
        error: 'cross-agent force-expire requires --reason="<short text>" (non-empty)',
        classification: 'cross-agent',
        ageSeconds,
      };
    }
    return { allowed: true, classification: 'cross-agent', ageSeconds };
  }

  // Layer C: same-agent + young claim still needs --really.
  if (isYoung && !hasReally) {
    return {
      allowed: false,
      error: `claim is younger than ${MIN_FORCE_EXPIRE_AGE_MINUTES} min (${ageSeconds}s old) — pass --really to override your own in-flight claim`,
      classification: 'young-claim-override',
      ageSeconds,
    };
  }

  return {
    allowed: true,
    classification: isYoung ? 'young-claim-override' : 'self',
    ageSeconds,
  };
}

/**
 * Tier label for the structured abandoned-check (TPL-225).
 *
 *   'high'   → ALL three signals positively say "abandoned"; trivially safe
 *              to force-expire cross-agent without operator confirmation.
 *   'medium' → no signal says "alive" but one or more signals could not be
 *              evaluated (e.g. not a git repo). Operator confirmation required
 *              before the cross-agent override is accepted.
 *   'low'    → at least one signal positively says "alive" (claim is young,
 *              git log shows recent commits by the claim's agent, or git
 *              stash list mentions the claim/agent). Hard reject for
 *              cross-agent overrides unless `--operator-confirmed` is set
 *              alongside `COA_OPERATOR=1` in the environment.
 */
export const ABANDONED_CONFIDENCE = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

/**
 * Structured "is this claim actually abandoned?" check (TPL-225).
 *
 * Inspects three independent signals to decide whether a claim is plausibly
 * abandoned, then aggregates them into a confidence tier. Pure function —
 * `gitCmd` and `stashCmd` are injected so tests can simulate any environment
 * without touching the host filesystem. Both helpers receive an args array
 * and must return either `{ status, stdout }` or null/undefined when the
 * command could not be evaluated.
 *
 * Signals:
 *   age          — alive if `claim.created` is within MIN_FORCE_EXPIRE_AGE_MINUTES
 *                  of `now`; abandoned otherwise.
 *   git activity — `gitCmd(['log', '--author=<agent>', '--since=<created>',
 *                  '--oneline'])` returning commits → alive; empty stdout
 *                  with status 0 → abandoned; non-zero status or missing
 *                  cmd → unknown.
 *   stash        — `stashCmd(['list'])` entry mentioning `claim.id` (or
 *                  `claim.agent` as fallback) → alive; otherwise abandoned;
 *                  non-zero status or missing cmd → unknown.
 *
 * Fast path: a TTL-expired claim short-circuits to high-confidence abandoned —
 * no in-flight session is keeping it alive past its TTL.
 *
 * Returns `{ abandoned, confidence, signals }` where `signals` is a
 * deterministic, human-readable list of the cues this call acted on. The
 * signals array is descriptive only — confidence is the load-bearing
 * decision surface.
 *
 * Field-finding-012: the TPL-223 session force-expired a 2-minute-old claim
 * with active WIP because TPL-221 only validated the *form* of the override
 * (--really + --reason), never the *facts* on the ground. This helper closes
 * that gap.
 */
export function checkClaimAbandoned({ claim, gitCmd, stashCmd, now } = {}) {
  const nowDate = now || new Date();
  const signals = [];

  if (!claim) {
    return { abandoned: false, confidence: ABANDONED_CONFIDENCE.LOW, signals: ['claim missing'] };
  }

  // Fast path: a TTL-expired claim is by definition not in flight.
  if (claim.expires) {
    const exp = new Date(claim.expires);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < nowDate.getTime()) {
      signals.push(`claim TTL expired at ${claim.expires}`);
      return { abandoned: true, confidence: ABANDONED_CONFIDENCE.HIGH, signals };
    }
  }

  // Signal 1: age (purely from claim.created vs now).
  const ageSec = claimAgeSeconds(claim, nowDate);
  const isYoung = ageSec < MIN_FORCE_EXPIRE_AGE_MINUTES * 60;
  let ageSignal;
  if (isYoung) {
    ageSignal = 'alive';
    signals.push(
      `claim is ${ageSec}s old (younger than the ${MIN_FORCE_EXPIRE_AGE_MINUTES}-min young-claim guard)`,
    );
  } else {
    ageSignal = 'abandoned';
    signals.push(
      `claim is ${ageSec}s old (past the ${MIN_FORCE_EXPIRE_AGE_MINUTES}-min young-claim guard)`,
    );
  }

  // Signal 2: git activity by claim.agent since claim.created.
  let gitSignal = 'unknown';
  if (typeof gitCmd === 'function' && claim.agent && claim.created) {
    let res;
    try {
      res = gitCmd(['log', `--author=${claim.agent}`, `--since=${claim.created}`, '--oneline']);
    } catch {
      res = null;
    }
    if (res && typeof res === 'object' && res.status === 0) {
      const out = String(res.stdout || '').trim();
      if (out.length > 0) {
        const lines = out.split(/\r?\n/).filter(Boolean);
        gitSignal = 'alive';
        signals.push(
          `git log shows ${lines.length} commit(s) by ${claim.agent} since claim.created`,
        );
      } else {
        gitSignal = 'abandoned';
        signals.push(`git log shows no commits by ${claim.agent} since claim.created`);
      }
    } else {
      signals.push('git activity check unavailable (not a git repo or git failed)');
    }
  } else {
    signals.push('git activity check unavailable (gitCmd not injected)');
  }

  // Signal 3: git stash list entry mentioning claim.id or claim.agent.
  let stashSignal = 'unknown';
  if (typeof stashCmd === 'function') {
    let res;
    try {
      res = stashCmd(['list']);
    } catch {
      res = null;
    }
    if (res && typeof res === 'object' && res.status === 0) {
      const lines = String(res.stdout || '')
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0);
      const idMatch = claim.id && lines.some((l) => l.includes(claim.id));
      const agentMatch =
        claim.agent &&
        lines.some((l) => l.toLowerCase().includes(String(claim.agent).toLowerCase()));
      if (idMatch) {
        stashSignal = 'alive';
        signals.push(`git stash list contains claim ID ${claim.id}`);
      } else if (agentMatch) {
        stashSignal = 'alive';
        signals.push(`git stash list contains claim agent ${claim.agent}`);
      } else {
        stashSignal = 'abandoned';
        signals.push(
          lines.length === 0
            ? 'git stash list is empty'
            : `git stash list has ${lines.length} entries but none mention claim ID or agent`,
        );
      }
    } else {
      signals.push('git stash check unavailable (not a git repo or stash failed)');
    }
  } else {
    signals.push('git stash check unavailable (stashCmd not injected)');
  }

  // Aggregate. Any 'alive' signal pulls confidence to LOW (the claim looks
  // in-flight). All-abandoned with no unknowns yields HIGH. Anything else —
  // silent signals plus no positive life — is MEDIUM (operator must decide).
  const labels = [ageSignal, gitSignal, stashSignal];
  const aliveCount = labels.filter((l) => l === 'alive').length;
  const abandonedCount = labels.filter((l) => l === 'abandoned').length;

  if (aliveCount > 0) {
    return { abandoned: false, confidence: ABANDONED_CONFIDENCE.LOW, signals };
  }
  if (abandonedCount === labels.length) {
    return { abandoned: true, confidence: ABANDONED_CONFIDENCE.HIGH, signals };
  }
  return { abandoned: false, confidence: ABANDONED_CONFIDENCE.MEDIUM, signals };
}

/**
 * Build a structured audit event payload for the .claims/audit.log JSON Lines
 * stream. Pure function — caller is responsible for I/O.
 *
 * `event` is one of `'force-expire'`, `'force-expire-rejected'`, `'create'`.
 * The `decision` parameter (from validateForceExpireRequest) supplies
 * classification + ageSeconds; for `'create'` events, callers pass
 * `{ classification: 'self', ageSeconds: 0 }`.
 *
 * `abandonedCheck` (optional, TPL-225) embeds the structured tier + signals
 * captured before a cross-agent override decision so an operator can later
 * reconstruct what the script saw on the ground at decision time.
 * `operatorConfirmed` records whether the human operator explicitly cleared
 * the override (--operator-confirmed flag + COA_OPERATOR=1 env).
 */
export function buildAuditEvent({
  event,
  claim,
  callerAgent,
  reason,
  decision,
  now,
  abandonedCheck,
  operatorConfirmed,
} = {}) {
  const ts = (now || new Date()).toISOString();
  const cls = decision?.classification || null;
  const ev = {
    ts,
    event,
    claimId: claim?.id || null,
    claimAgent: claim?.agent || null,
    claimSlice: claim?.slice || null,
    claimAge_seconds: decision?.ageSeconds ?? 0,
    callerAgent: callerAgent || null,
    reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
    crossAgent: cls === 'cross-agent',
    youngClaimOverride: cls === 'young-claim-override',
  };
  if (abandonedCheck) {
    ev.abandonedCheck = {
      abandoned: !!abandonedCheck.abandoned,
      confidence: abandonedCheck.confidence,
      signals: Array.isArray(abandonedCheck.signals) ? [...abandonedCheck.signals] : [],
      operatorConfirmed: !!operatorConfirmed,
    };
  }
  return ev;
}

/**
 * Detect claims using the "negotiate" strategy.
 * Returns only those claims that require human or priority resolution.
 */
export function detectNegotiations(claims) {
  return claims.filter((c) => c.strategy === 'negotiate');
}

/**
 * Order claims by priority: high > medium > low.
 * Missing priority is treated as medium.
 * Tiebreak: first-filed wins (earliest `created` timestamp).
 */
export function resolveByPriority(claims) {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...claims].sort((a, b) => {
    const ra = rank[a.priority] ?? 1;
    const rb = rank[b.priority] ?? 1;
    if (ra !== rb) return ra - rb;
    return new Date(a.created || 0) - new Date(b.created || 0);
  });
}

/**
 * Create a counter-claim linked to an existing claim.
 * Counter-claims always use strategy "negotiate".
 * The caller provides agent, slice, and targets.
 */
export function createCounterClaim(originalClaim, { agent, slice, targets, notes }) {
  const now = new Date();
  const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8-hour TTL
  return {
    id: `${originalClaim.id}-counter-${Math.random().toString(16).slice(2, 8)}`,
    agent,
    slice,
    created: now.toISOString(),
    expires: expires.toISOString(),
    status: 'active',
    targets: targets || [],
    strategy: 'negotiate',
    counterTo: originalClaim.id,
    dependsOn: [],
    notes: notes || `Counter-claim against ${originalClaim.id} (${originalClaim.agent})`,
  };
}

/**
 * Query all active, non-expired claims that target a specific file path.
 * Normalizes path separators for cross-platform compatibility.
 */
export function queryActiveClaimsForPath(claims, filePath, now = new Date()) {
  const normalizedPath = String(filePath).replaceAll('\\', '/');
  return claims.filter((c) => {
    if (c.status !== 'active') return false;
    if (new Date(c.expires) < now) return false;
    const targets = Array.isArray(c.targets) ? c.targets : [];
    return targets.some((t) => String(t.path).replaceAll('\\', '/') === normalizedPath);
  });
}

/**
 * Topological sort of claims based on dependsOn field (Kahn's algorithm).
 * Returns { ordered, cycles } where ordered is the topological order and
 * cycles contains arrays of claim IDs involved in circular dependencies.
 * References to unknown claim IDs are ignored (treated as already resolved).
 */
export function resolveDependencyOrder(claims) {
  if (claims.length === 0) return { ordered: [], cycles: [] };

  const byId = new Map(claims.map((c) => [c.id, c]));
  // Build in-degree map, only counting edges to known claims
  const inDegree = new Map(claims.map((c) => [c.id, 0]));
  const dependents = new Map(claims.map((c) => [c.id, []])); // id -> list of ids that depend on it

  for (const c of claims) {
    const deps = Array.isArray(c.dependsOn) ? c.dependsOn : [];
    for (const depId of deps) {
      if (!byId.has(depId)) continue; // unknown dep — ignore
      inDegree.set(c.id, (inDegree.get(c.id) || 0) + 1);
      dependents.get(depId).push(c.id);
    }
  }

  // Kahn's: start with zero in-degree
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const ordered = [];
  while (queue.length > 0) {
    const id = queue.shift();
    ordered.push(byId.get(id));
    for (const depId of dependents.get(id) || []) {
      const newDeg = inDegree.get(depId) - 1;
      inDegree.set(depId, newDeg);
      if (newDeg === 0) queue.push(depId);
    }
  }

  // Remaining nodes with non-zero in-degree are in cycles
  const cycleIds = claims.map((c) => c.id).filter((id) => !ordered.some((o) => o.id === id));
  const cycles = cycleIds.length > 0 ? [cycleIds] : [];

  return { ordered, cycles };
}

/**
 * Classify active claims as ready or blocked based on dependsOn resolution.
 * A claim is "blocked" if any dependsOn ID references an active claim in allClaims.
 * Unknown dep IDs and completed/abandoned/expired deps are treated as resolved.
 */
export function classifyClaimReadiness(activeClaims, allClaims) {
  const statusById = new Map(allClaims.map((c) => [c.id, c.status]));
  const resolved = new Set(['completed', 'abandoned', 'expired']);

  const ready = [];
  const blocked = [];

  for (const c of activeClaims) {
    const deps = Array.isArray(c.dependsOn) ? c.dependsOn : [];
    const blockingDeps = deps.filter((depId) => {
      const status = statusById.get(depId);
      // Unknown or resolved deps are not blocking
      return status !== undefined && !resolved.has(status);
    });
    if (blockingDeps.length > 0) {
      blocked.push({ claim: c, blockedBy: blockingDeps });
    } else {
      ready.push(c);
    }
  }

  return { ready, blocked };
}

/**
 * Tag claims with a _repo field for federation tracking.
 * Returns new claim objects — does not mutate originals.
 */
export function tagFederatedClaims(claims, repoId) {
  return claims.map((c) => ({ ...c, _repo: repoId }));
}

/**
 * Merge local claims with federated claim sets from other repositories.
 * Local claims get _repo: 'local'. Each federated set's claims get their repoId.
 * Does not mutate any input arrays or objects.
 *
 * @param {Array} localClaims - Claims from the current repository
 * @param {Array<{repoId: string, claims: Array}>} federatedSets - External claim sets
 */
export function mergeFederatedClaims(localClaims, federatedSets) {
  const tagged = tagFederatedClaims(localClaims, 'local');
  for (const { repoId, claims } of federatedSets) {
    tagged.push(...tagFederatedClaims(claims, repoId));
  }
  return tagged;
}

/**
 * Generate a random claim ID.
 */
export function generateClaimId() {
  return `clm-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * Build a complete claim object from parameters.
 * Pure function — no side effects.
 */
export function buildClaimObject({
  agent,
  slice,
  targets,
  strategy,
  ttlHours,
  priority,
  dependsOn,
  notes,
}) {
  // Cap TTL to MAX_TTL_HOURS
  const effectiveTtl = Math.min(ttlHours || 8, MAX_TTL_HOURS);
  const now = new Date();
  const expires = new Date(now.getTime() + effectiveTtl * 60 * 60 * 1000);

  // Validate strategy
  const effectiveStrategy = strategy || 'bba-additive';
  if (!VALID_STRATEGIES.has(effectiveStrategy)) {
    throw new Error(
      `Invalid strategy: ${effectiveStrategy}. Allowed: ${[...VALID_STRATEGIES].join(', ')}`,
    );
  }

  // Validate targets
  const rawTargets = targets || [];
  if (rawTargets.length > MAX_TARGETS) {
    throw new Error(`Too many targets: ${rawTargets.length}. Maximum: ${MAX_TARGETS}`);
  }
  const builtTargets = rawTargets.map((t) => {
    const action = t.action || 'extend';
    if (!VALID_ACTIONS.has(action)) {
      throw new Error(`Invalid action: ${action}. Allowed: ${[...VALID_ACTIONS].join(', ')}`);
    }
    if (t.path && !isValidTargetPath(t.path)) {
      throw new Error(
        `Invalid target path: ${t.path}. Paths must not contain '..' or start with '/'.`,
      );
    }
    return {
      path: t.path,
      module: t.module || null,
      surface: t.surface || 'shared-infra',
      action,
      description: t.description || '',
    };
  });

  return {
    id: generateClaimId(),
    agent: agent || 'unknown',
    slice: slice || 'unknown',
    created: now.toISOString(),
    expires: expires.toISOString(),
    status: 'active',
    targets: builtTargets,
    strategy: effectiveStrategy,
    priority: priority || 'medium',
    dependsOn: dependsOn || [],
    notes: notes || '',
  };
}

/**
 * Find active claims whose ALL non-extended targets appear in the given
 * proof set (staged files OR a commit's diff-tree, depending on caller).
 * Optionally filter by agent name. Returns the subset of claims that can be
 * marked "completed".
 *
 * TPL-223/J3.6 — targets carrying `extended: true` (added by
 * `tryExtendClaim` during coa-merge ceremony) are *aspirational* coverage:
 * they protect against parallel-session conflict but must NOT gate
 * completion. Without this exclusion, `coa-merge` ceremony adds regen
 * paths whose content didn't change (LOCAL.md, MICRO.md, AGENTS.md,
 * .cursorrules in the no-op case), those paths aren't in the staged or
 * committed-tree set, and the slice's own claim could never auto-complete
 * despite the user-acquired targets all landing in the commit.
 *
 * The completion test is therefore: every originally-acquired (non-extended)
 * target must appear in the proof set. A claim with only extended targets is
 * not meaningfully completable from the proof side and is excluded.
 */
export function findCompletableClaims(claims, stagedFiles, { agent, now } = {}) {
  const effectiveNow = now || new Date();
  const normalizedStaged = new Set(stagedFiles.map((f) => String(f).replaceAll('\\', '/')));
  return claims.filter((c) => {
    if (c.status !== 'active') return false;
    if (new Date(c.expires) < effectiveNow) return false;
    if (agent && c.agent !== agent) return false;
    const targets = Array.isArray(c.targets) ? c.targets : [];
    if (targets.length === 0) return false;
    const userTargets = targets.filter((t) => !t?.extended);
    if (userTargets.length === 0) return false;
    return userTargets.every((t) => normalizedStaged.has(String(t.path).replaceAll('\\', '/')));
  });
}

/**
 * Audit for stale claims: status == "active" but expires < now.
 */
export function auditStaleClaims(claims, now = new Date()) {
  return claims.filter((c) => {
    if (c.status !== 'active') return false;
    const expires = new Date(c.expires);
    return expires < now;
  });
}

/**
 * Default protected path patterns for shared-infra protection.
 * Used when no .claims/config.json exists or has no protectedPaths field.
 *
 * Three groups, each shared-state and merge-hostile under parallel writes:
 *
 * - Release-discipline: VERSION, CHANGELOG.md, package.json — bumped on every
 *   atomic commit; last-writer-wins on git rebase.
 * - Build/CI infrastructure: pnpm-lock.yaml, docs/SYSTEM_MAP.md,
 *   .github/workflows/*, .githooks/*, scripts/checks/_shared.mjs.
 * - Control-plane / agent contract: docs/agent-contract/*.json,
 *   .claims/config.json, .claude/CLAUDE.md, .claude/rules/*,
 *   .claude/settings.json, .claude/hooks/*, AGENTS.md, .cursorrules.
 *   These configure how agents coordinate; conflicting parallel edits
 *   silently change the rules of the game for every other session.
 *
 * AGENTS.md and .cursorrules are protected even though they are generated
 * from docs/agent-contract/compatibility-contract.json by Phase 5
 * (`scripts/agent-contract/sync.mjs`). The protected-path advisory only
 * fires during `--enforce --staged` (which runs in Phase 3, before Phase 5
 * regenerates them); manual edits to either file are an anti-pattern that
 * the advisory correctly flags.
 *
 * Mirrors `.claims/config.json#protectedPaths` so the default and the
 * configured value are in sync — the config wins when present, but a
 * fresh-cloned template with no config.json must produce the same
 * protection behaviour.
 */
export const DEFAULT_PROTECTED_PATHS = [
  // Release discipline
  'CHANGELOG.md',
  'VERSION',
  'package.json',
  // Build / CI infrastructure
  'pnpm-lock.yaml',
  'docs/SYSTEM_MAP.md',
  '.github/workflows/*',
  '.githooks/*',
  'scripts/checks/_shared.mjs',
  // Control-plane / agent contract
  'docs/agent-contract/compatibility-contract.json',
  'docs/agent-contract/dangerous-commands.json',
  '.claims/config.json',
  '.claude/CLAUDE.md',
  '.claude/rules/*',
  '.claude/settings.json',
  '.claude/hooks/*',
  'AGENTS.md',
  '.cursorrules',
];

/**
 * Load protected path patterns from a config object.
 * Falls back to DEFAULT_PROTECTED_PATHS when config is null/undefined or missing the field.
 */
export function loadProtectedPaths(config) {
  if (config && Array.isArray(config.protectedPaths)) {
    return config.protectedPaths;
  }
  return DEFAULT_PROTECTED_PATHS;
}

/**
 * Simple glob matcher supporting only trailing `*` (e.g. `.github/workflows/*`).
 * Returns true if filePath matches pattern.
 */
export function matchesProtectedPattern(filePath, pattern) {
  const normFile = String(filePath).replaceAll('\\', '/');
  const normPattern = String(pattern).replaceAll('\\', '/');
  if (normPattern.endsWith('/*')) {
    const prefix = normPattern.slice(0, -1); // remove trailing *
    return normFile.startsWith(prefix);
  }
  return normFile === normPattern;
}

/**
 * Check which staged files match protected path patterns but lack an active
 * modify/replace claim covering them.
 *
 * Returns an array of { path, pattern } objects for files that should have
 * claims but don't. This is advisory — callers decide whether to warn or block.
 */
export function checkProtectedPaths(stagedFiles, activeClaims, protectedPatterns) {
  const warnings = [];
  // Build a set of paths covered by active modify/replace claims
  const coveredPaths = new Set();
  for (const claim of activeClaims) {
    const targets = Array.isArray(claim.targets) ? claim.targets : [];
    for (const t of targets) {
      const action = t.action || 'extend';
      if (action === 'modify' || action === 'replace' || action === 'extend') {
        coveredPaths.add(String(t.path).replaceAll('\\', '/'));
      }
    }
  }

  for (const file of stagedFiles) {
    const normFile = String(file).replaceAll('\\', '/');
    for (const pattern of protectedPatterns) {
      if (matchesProtectedPattern(normFile, pattern) && !coveredPaths.has(normFile)) {
        warnings.push({ path: normFile, pattern });
        break; // one warning per file is enough
      }
    }
  }
  return warnings;
}

/**
 * Decide whether a caller is authorized to flip a claim's status to
 * `completed` via `--auto-complete --staged` (TPL-223 / Entry-011 J3.5).
 *
 * Pre-fix, auto-complete had no agent gate — any session whose staged set
 * happened to be a superset of another session's claim targets would
 * silently mark that other session's claim `completed`. This is the
 * cooperative-but-wrong sibling of J3: the staging-set intersection alone
 * was treated as proof of ownership.
 *
 * Layers (mirrors validateForceExpireRequest from TPL-221):
 *
 *   A. Self-identify — `callerAgent` is required. An empty/missing caller
 *      is rejected with a `null` classification.
 *   B. Same-agent default — when callerAgent matches `claim.agent`, accept
 *      with classification `'self'`.
 *   C. Cross-agent escape — when callerAgent !== claim.agent, both
 *      `hasReally` and a non-empty `reason` are required. Without
 *      `--really` we classify as `'cross-agent-no-really'` and the CLI
 *      treats this as a silent skip (foreign claim, normal). Without
 *      `--reason` we classify as `'cross-agent-no-reason'` and the CLI
 *      treats this as a hard rejection (operator started an override but
 *      forgot to justify it).
 *
 * Returns `{ authorized, classification, reason? }`. Pure function — no I/O,
 * no audit-log side effects (the caller owns that).
 */
export function verifyAgentAuthorization({ claim, callerAgent, hasReally, reason } = {}) {
  if (!claim) {
    return { authorized: false, classification: null, reason: 'no claim provided' };
  }

  const trimmedCaller = typeof callerAgent === 'string' ? callerAgent.trim() : '';
  if (!trimmedCaller) {
    return {
      authorized: false,
      classification: null,
      reason: '--agent=<your-agent> is required (caller must self-identify)',
    };
  }

  if (trimmedCaller === claim.agent) {
    return { authorized: true, classification: 'self' };
  }

  // Cross-agent path: both --really and a non-empty --reason are required.
  // The two failure modes are distinguished so the CLI can treat the bare
  // "foreign claim, no escalation" case as a silent skip while the
  // "started override but didn't justify" case is a hard rejection.
  if (!hasReally) {
    return {
      authorized: false,
      classification: 'cross-agent-no-really',
      reason: `cross-agent --auto-complete requires --really (claim agent: ${claim.agent}, caller: ${trimmedCaller})`,
    };
  }
  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  if (!trimmedReason) {
    return {
      authorized: false,
      classification: 'cross-agent-no-reason',
      reason:
        'cross-agent --auto-complete with --really requires --reason="<short text>" (non-empty)',
    };
  }
  return { authorized: true, classification: 'cross-agent' };
}

/**
 * Verify that the work covered by a claim has actually been committed before
 * its status flips to `completed` (TPL-223 / Entry-010 J3).
 *
 * Pre-fix, `--auto-complete --staged` flipped any claim whose targets matched
 * the staged file set, with no check that a `git commit` had happened. A
 * session that ran auto-complete and then closed without committing left the
 * working tree with VERSION + CHANGELOG mutated, an active staging set, HEAD
 * unmoved, and a claim file lying that the work was done.
 *
 * Three modes accept the request, each subsuming a different trust signal:
 *
 *   1. `commitHash` provided — the caller asserts "this commit-hash carries
 *      the slice's work." The hash must exist in git history AND its commit
 *      must have touched every (non-extended) claim target.
 *   2. `fromPreCommitHook` — privileged short-circuit used by the pre-commit
 *      hook's post-success block. The hook knows `git commit` is about to
 *      finalize and treats that as proof; the operator-facing CLI does not
 *      get this trust.
 *   3. Neither — auto-complete reads HEAD and verifies the most recent
 *      commit already touched every (non-extended) claim target. This is the
 *      post-commit operator path: commit first, then run auto-complete.
 *
 * `gitCmd` is an injectable function `(args: string[]) => { stdout, stderr,
 * status }` so unit tests can stub git without spawning a child process. The
 * production CLI passes a `spawnSync('git', args, { encoding: 'utf8' })`
 * shim. Pure aside from gitCmd's I/O — no filesystem writes, no audit log
 * side effects (the caller owns that).
 *
 * J3.6 — extended targets are excluded from the "must be in commit"
 * check, mirroring `findCompletableClaims`. Ceremony and regen paths
 * sometimes land with no diff and therefore aren't in the commit tree;
 * the user-acquired targets are the load-bearing proof.
 *
 * Returns `{ verified, mode, commitHash?, reason? }` where `mode` is one of
 * `'commit-hash' | 'pre-commit-hook' | 'head-moved' | null` and is set even
 * on rejection so callers can record the attempted classification.
 */
export function verifyClaimWorkCommitted({ claim, gitCmd, commitHash, fromPreCommitHook } = {}) {
  // Mode 2: pre-commit hook short-circuit. Trust the caller — the hook
  // environment is the trust signal. Returns before claim/gitCmd checks so a
  // missing/empty claim cannot block the hook's post-success block.
  if (fromPreCommitHook) {
    return { verified: true, mode: 'pre-commit-hook' };
  }

  if (!claim) {
    return { verified: false, mode: null, reason: 'no claim provided' };
  }
  if (typeof gitCmd !== 'function') {
    return { verified: false, mode: null, reason: 'gitCmd is required' };
  }

  // J3.6: only originally-acquired targets must be in the commit. Extended
  // targets (added during coa-merge ceremony) are aspirational coverage.
  const claimPaths = (Array.isArray(claim.targets) ? claim.targets : [])
    .filter((t) => !t?.extended)
    .map((t) => String(t?.path ?? '').replaceAll('\\', '/'))
    .filter(Boolean);

  // Helper: list files touched by `hash` (one path per line). Returns null if
  // the hash is missing or git fails. `git log -n 1 --format= --name-only`
  // handles the initial-commit case better than `diff-tree` and works on
  // both merge and root commits.
  const filesInCommit = (hash) => {
    const exists = gitCmd(['cat-file', '-e', hash]);
    if (!exists || exists.status !== 0) return null;
    const out = gitCmd(['log', '-n', '1', '--format=', '--name-only', hash]);
    if (!out || out.status !== 0) return null;
    return String(out.stdout || '')
      .split(/\r?\n/)
      .map((l) => l.trim().replaceAll('\\', '/'))
      .filter(Boolean);
  };

  // Mode 1: explicit commit hash provided.
  if (commitHash) {
    const files = filesInCommit(commitHash);
    if (files === null) {
      return {
        verified: false,
        mode: 'commit-hash',
        reason: `commit ${commitHash} not found in git log`,
      };
    }
    const fileSet = new Set(files);
    const missing = claimPaths.filter((p) => !fileSet.has(p));
    if (missing.length > 0) {
      return {
        verified: false,
        mode: 'commit-hash',
        commitHash,
        reason: `commit ${commitHash} does not include claim target(s): ${missing.join(', ')}`,
      };
    }
    return { verified: true, mode: 'commit-hash', commitHash };
  }

  // Mode 3: HEAD-moved auto-detect — most recent commit must cover the claim.
  const headResult = gitCmd(['rev-parse', 'HEAD']);
  if (!headResult || headResult.status !== 0) {
    return {
      verified: false,
      mode: 'head-moved',
      reason: 'cannot read HEAD (no commits yet, or not a git repository)',
    };
  }
  const headHash = String(headResult.stdout || '').trim();
  if (!headHash) {
    return { verified: false, mode: 'head-moved', reason: 'HEAD did not resolve to a commit' };
  }
  const files = filesInCommit(headHash);
  if (files === null) {
    return { verified: false, mode: 'head-moved', reason: 'cannot read HEAD commit contents' };
  }
  const fileSet = new Set(files);
  const missing = claimPaths.filter((p) => !fileSet.has(p));
  if (missing.length > 0) {
    return {
      verified: false,
      mode: 'head-moved',
      commitHash: headHash,
      reason: `HEAD commit (${headHash.slice(0, 7)}) does not include claim target(s): ${missing.join(', ')}; commit your slice first, or pass --commit-hash=<hash>`,
    };
  }
  return { verified: true, mode: 'head-moved', commitHash: headHash };
}

/**
 * Attempt to extend an existing claim with additional targets (TPL-222 J5).
 *
 * Pure function — returns `{ success, claim, addedTargets, error }`. Caller is
 * responsible for writing the updated claim file and appending the audit-log
 * event.
 *
 * Authorization model mirrors --force-expire's same-agent layer: caller must
 * self-identify and the agent must match. Cross-agent extend is rejected
 * outright (no `--really` escape) — the use case is "ceremony stages files
 * the active claim does not yet cover", which only makes sense for the claim's
 * own agent. Cross-session extend would silently change another agent's claim
 * scope and is exactly the trust boundary --force-expire was built to defend.
 */
export function tryExtendClaim({ claim, callerAgent, addTargets, action = 'modify' } = {}) {
  if (!claim) {
    return { success: false, error: 'claim not found', claim: null, addedTargets: [] };
  }
  if (claim.status !== 'active') {
    return {
      success: false,
      error: `claim ${claim.id} is ${claim.status} — only active claims can be extended`,
      claim: null,
      addedTargets: [],
    };
  }
  const trimmedCaller = typeof callerAgent === 'string' ? callerAgent.trim() : '';
  if (!trimmedCaller) {
    return {
      success: false,
      error: '--agent=<your-agent> is required (caller must self-identify)',
      claim: null,
      addedTargets: [],
    };
  }
  if (trimmedCaller !== claim.agent) {
    return {
      success: false,
      error: `cross-agent extend not allowed (claim agent: ${claim.agent}, caller: ${trimmedCaller})`,
      claim: null,
      addedTargets: [],
    };
  }
  if (!VALID_ACTIONS.has(action)) {
    return {
      success: false,
      error: `invalid action: ${action}. Allowed: ${[...VALID_ACTIONS].join(', ')}`,
      claim: null,
      addedTargets: [],
    };
  }
  const rawPaths = (Array.isArray(addTargets) ? addTargets : [])
    .filter((p) => typeof p === 'string' && p.length > 0)
    .map((p) => p.replaceAll('\\', '/'));
  const invalid = rawPaths.filter((p) => !isValidTargetPath(p));
  if (invalid.length > 0) {
    return {
      success: false,
      error: `invalid target path(s): ${invalid.join(', ')}`,
      claim: null,
      addedTargets: [],
    };
  }
  const existingTargets = Array.isArray(claim.targets) ? claim.targets : [];
  const existingPathSet = new Set(existingTargets.map((t) => String(t.path).replaceAll('\\', '/')));
  const newTargets = [];
  const seen = new Set();
  for (const p of rawPaths) {
    if (existingPathSet.has(p) || seen.has(p)) continue;
    seen.add(p);
    newTargets.push({
      path: p,
      module: null,
      surface: 'shared-infra',
      action,
      description: 'auto-extended by coa-merge',
      // TPL-223/J3.6: mark as aspirational so findCompletableClaims excludes
      // these from the "all targets must be in proof set" check. Ceremony
      // and regen paths (VERSION, CHANGELOG.md, AGENTS.md, .cursorrules,
      // LOCAL.md, MICRO.md, etc.) sometimes land with no diff against HEAD
      // and therefore aren't in the commit's tree — completion still has
      // to fire for the user-acquired targets.
      extended: true,
    });
  }
  const totalCount = existingTargets.length + newTargets.length;
  if (totalCount > MAX_TARGETS) {
    return {
      success: false,
      error: `extend would exceed MAX_TARGETS (${MAX_TARGETS}): existing ${existingTargets.length} + new ${newTargets.length}`,
      claim: null,
      addedTargets: [],
    };
  }
  // No new targets is a no-op success — caller may not need to touch disk.
  const updatedClaim = {
    ...claim,
    targets: [...existingTargets, ...newTargets],
  };
  delete updatedClaim._file;
  return { success: true, claim: updatedClaim, addedTargets: newTargets, error: null };
}

/**
 * Attempt to acquire a claim atomically: check for conflicts first, only
 * create the claim if no blocking conflicts exist.
 *
 * Pure function — returns { success, claim, overlaps, conflicts }.
 * The caller is responsible for writing the claim file and managing locks.
 *
 * `protectedPaths` (optional) — when supplied, forwarded to detectOverlaps()
 * so that extend+extend overlaps on shared-infra paths escalate to conflict.
 * Default is the legacy 3-file list inside detectOverlaps(); main() supplies
 * the full DEFAULT_PROTECTED_PATHS resolved from .claims/config.json.
 */
export function tryAcquireClaim(activeClaims, claimParams, protectedPaths) {
  const { targets: targetPaths, action } = claimParams;
  const paths = (targetPaths || []).map((t) => (typeof t === 'string' ? t : t.path));
  const overlaps = detectOverlaps(activeClaims, paths, action || 'modify', protectedPaths);
  const blocking = overlaps.filter((o) => o.severity === 'conflict');

  if (blocking.length > 0) {
    return { success: false, claim: null, overlaps, conflicts: blocking };
  }

  const claimTargets = (targetPaths || []).map((t) =>
    typeof t === 'string' ? { path: t, action: action || 'modify' } : t,
  );
  const claim = buildClaimObject({ ...claimParams, targets: claimTargets });
  return { success: true, claim, overlaps, conflicts: [] };
}

// ---------------------------------------------------------------------------
// CLI runner (only runs when executed directly, not when imported for tests)
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import { mkdir, rename, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const LOCKS_DIR = join(CLAIMS_DIR, '.locks');

/**
 * Acquire a filesystem lock for atomic claim creation.
 * Uses write-to-temp + rename for atomicity.
 * Returns a release function. Throws on contention.
 */
async function acquireLock(lockName, timeoutMs = 5000) {
  await mkdir(LOCKS_DIR, { recursive: true });
  const lockPath = join(LOCKS_DIR, `${lockName}.lock`);
  const tempPath = join(tmpdir(), `clm-lock-${randomBytes(6).toString('hex')}`);
  const startTime = Date.now();

  // Write temp file with our PID
  await writeFile(tempPath, JSON.stringify({ pid: process.pid, ts: new Date().toISOString() }));

  // Attempt to create lock via rename (atomic on same filesystem) or exclusive write
  while (true) {
    try {
      // Try exclusive create — if file exists, this fails
      await writeFile(lockPath, await readFile(tempPath, 'utf8'), { flag: 'wx' });
      await unlink(tempPath).catch(() => {});
      // Lock acquired
      return async function releaseLock() {
        await unlink(lockPath).catch(() => {});
      };
    } catch (err) {
      if (err.code !== 'EEXIST') {
        await unlink(tempPath).catch(() => {});
        throw err;
      }
      // Lock exists — check timeout
      if (Date.now() - startTime > timeoutMs) {
        await unlink(tempPath).catch(() => {});
        // Force-break stale lock (lock holder likely crashed)
        await unlink(lockPath).catch(() => {});
        throw new Error(`claim lock contention on ${lockName} — timed out after ${timeoutMs}ms`);
      }
      // Brief wait before retry
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

/**
 * Append a JSON Lines event to .claims/audit.log. Best-effort: failures are
 * swallowed so a missing/locked log file never breaks the underlying claim
 * operation. The audit log is operator-local (gitignored) and append-only.
 */
async function appendAuditEvent(event) {
  if (!event) return;
  const path = join(CLAIMS_DIR, AUDIT_LOG_FILE);
  const line = JSON.stringify(event) + '\n';
  try {
    await mkdir(CLAIMS_DIR, { recursive: true });
    await appendFile(path, line, 'utf8');
  } catch {
    /* swallow — audit log is observability, not load-bearing */
  }
}

/**
 * Read the last N lines from .claims/audit.log and parse each as a JSON event.
 * Returns the events in chronological order (oldest first within the window).
 * Malformed lines are skipped silently.
 */
async function readRecentAuditEvents(limit = 50) {
  const path = join(CLAIMS_DIR, AUDIT_LOG_FILE);
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    return [];
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const tail = lines.slice(-Math.max(0, limit));
  const events = [];
  for (const line of tail) {
    try {
      events.push(JSON.parse(line, safeJsonReviver));
    } catch {
      /* skip malformed line */
    }
  }
  return events;
}

function getStagedFiles() {
  const run = spawnSync('git', ['diff', '--cached', '--name-only'], {
    encoding: 'utf8',
    shell: false,
  });
  if (run.status !== 0) return [];
  return String(run.stdout || '')
    .split(/\r?\n/)
    .map((l) => l.trim().replaceAll('\\', '/'))
    .filter(Boolean);
}

/**
 * Resolve the absolute path to `.git/COMMIT_EDITMSG`. `git rev-parse --git-dir`
 * returns either an absolute path (linked worktree) or a relative path like
 * `.git`; we resolve relative to process.cwd(). Returns null when not in a
 * git repo. Used by the TPL-317 frozen-paths override path to read the
 * pending commit-message body.
 */
async function resolveCommitEditMsgPath() {
  const run = spawnSync('git', ['rev-parse', '--git-dir'], {
    encoding: 'utf8',
    shell: false,
  });
  if (run.status !== 0) return null;
  const gitDir = String(run.stdout || '').trim();
  if (!gitDir) return null;
  return join(resolve(process.cwd(), gitDir), 'COMMIT_EDITMSG');
}

async function loadClaimsFromDir(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return []; // directory doesn't exist or is empty
  }
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const claims = [];
  for (const f of jsonFiles) {
    const text = await readFile(join(dir, f), 'utf8').catch(() => '');
    const claim = parseClaim(text, f);
    if (claim) claims.push(claim);
  }
  return claims;
}

async function loadClaims() {
  return loadClaimsFromDir(CLAIMS_DIR);
}

function formatOverlap(o) {
  const icon =
    o.severity === 'conflict' ? 'CONFLICT' : o.severity === 'nearby' ? 'NEARBY' : 'ADVISORY';
  let line = `  ${icon}: ${o.claimId} (${o.agent}, ${o.slice})`;
  line += `\n    target: ${o.path} [${o.claimAction}]`;
  if (o.description) line += `\n    reason: ${o.description}`;
  if (o.broad) line += `\n    WARNING: claim covers >5 targets (over-broad)`;
  return line;
}

async function main() {
  const args = parseArgs();
  const wantJson = args.has('--json');
  const auditMode = args.has('--audit');
  const targetsRaw = args.get('--targets');
  const action = args.get('--action') || 'modify';

  // Load .claims/config.json once. The resolved protectedPaths list (with
  // DEFAULT_PROTECTED_PATHS as fallback) is threaded through every
  // detectOverlaps()/tryAcquireClaim() call below, so extend+extend overlaps
  // on shared-infra paths beyond [VERSION, CHANGELOG.md, package.json]
  // escalate to conflict consistently across all CLI modes.
  let protectedConfig = null;
  try {
    const configText = await readFile(join(CLAIMS_DIR, 'config.json'), 'utf8');
    protectedConfig = JSON.parse(configText, safeJsonReviver);
  } catch {
    // No config file — loadProtectedPaths falls back to DEFAULT_PROTECTED_PATHS
  }
  const mainProtectedPaths = loadProtectedPaths(protectedConfig);

  // Load local claims
  const localClaims = await loadClaims();

  // --federated=<dir> mode: load claims from external directory
  const federatedDir = args.get('--federated');
  let allClaims;
  let federatedSets = [];
  if (federatedDir) {
    const fedClaims = await loadClaimsFromDir(federatedDir);
    const repoId =
      federatedDir.replaceAll('\\', '/').split('/').filter(Boolean).pop() || 'federated';
    federatedSets = [{ repoId, claims: fedClaims }];
    allClaims = mergeFederatedClaims(localClaims, federatedSets);
  } else {
    allClaims = localClaims;
  }

  // --create mode: create a new claim file in .claims/
  const createMode = args.has('--create');
  if (createMode) {
    const agent = args.get('--agent') || 'unknown';
    const slice = args.get('--slice') || 'unknown';
    const strategy = args.get('--strategy') || 'bba-additive';
    const ttlHours = Number(args.get('--ttl')) || 8;
    const priority = args.get('--priority') || 'medium';
    const targetPaths =
      typeof targetsRaw === 'string'
        ? targetsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    // Validate target paths before proceeding
    const invalidPaths = targetPaths.filter((p) => !isValidTargetPath(p));
    if (invalidPaths.length > 0) {
      console.error(`claim-check --create: invalid target path(s): ${invalidPaths.join(', ')}`);
      console.error("  Paths must not contain '..' or start with '/'.");
      process.exit(1);
    }

    const claimTargets = targetPaths.map((p) => ({ path: p, action }));
    const claim = buildClaimObject({
      agent,
      slice,
      targets: claimTargets,
      strategy,
      ttlHours,
      priority,
    });

    // Acquire lock, reload claims, check overlaps, then write — atomic create
    const fileName = `${claim.id}.json`;
    const filePath = join(CLAIMS_DIR, fileName);
    const release = await acquireLock('claim-create');
    let overlaps;
    try {
      const freshClaims = await loadClaims();
      const mergedFresh = federatedDir
        ? mergeFederatedClaims(freshClaims, federatedSets)
        : freshClaims;
      const now = new Date();
      const activeClaims = filterActiveClaims(mergedFresh, now);
      overlaps = detectOverlaps(activeClaims, targetPaths, action, mainProtectedPaths);
      await writeFile(filePath, JSON.stringify(claim, null, 2) + '\n', 'utf8');
    } finally {
      await release();
    }

    // Symmetric audit log entry — pairs with force-expire to give operators
    // a full coordination trace, not just a defect tracker.
    await appendAuditEvent(
      buildAuditEvent({
        event: 'create',
        claim,
        callerAgent: claim.agent,
        decision: { classification: 'self', ageSeconds: 0 },
      }),
    );

    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:create', true, [], [], {
            claimId: claim.id,
            file: filePath,
            overlapCount: overlaps.length,
            claim,
          }),
          null,
          2,
        ),
      );
    } else {
      console.log(`claim-check --create: ${claim.id} written to ${fileName}`);
      if (overlaps.length > 0) {
        console.log(`  WARNING: ${overlaps.length} overlap(s) with existing claims`);
        for (const o of overlaps) console.log(formatOverlap(o));
      }
    }
    return;
  }

  // --acquire mode: atomic check+create — fails on blocking conflicts (Phase 5)
  const acquireMode = args.has('--acquire');
  if (acquireMode) {
    const agent = args.get('--agent') || 'unknown';
    const slice = args.get('--slice') || 'unknown';
    const strategy = args.get('--strategy') || 'modify-in-place';
    const ttlHours = Number(args.get('--ttl')) || 8;
    const priority = args.get('--priority') || 'medium';
    const dependsOnRaw = args.get('--dependsOn');
    const dependsOn = dependsOnRaw
      ? dependsOnRaw
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      : [];
    const targetPaths =
      typeof targetsRaw === 'string'
        ? targetsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    // Validate target paths before proceeding
    const invalidPaths = targetPaths.filter((p) => !isValidTargetPath(p));
    if (invalidPaths.length > 0) {
      console.error(`claim-check --acquire: invalid target path(s): ${invalidPaths.join(', ')}`);
      console.error("  Paths must not contain '..' or start with '/'.");
      process.exit(1);
    }

    // TPL-317 — frozen subset (defense-in-depth for F12 explicit-scope
    // violation). Empty / absent flag yields an empty list, which means the
    // claim records no frozen paths and `--enforce --staged` finds nothing to
    // block on (backwards-compatible default).
    const frozenRaw = args.get('--frozen');
    const frozenPaths =
      typeof frozenRaw === 'string'
        ? frozenRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    const invalidFrozen = frozenPaths.filter((p) => !isValidTargetPath(p));
    if (invalidFrozen.length > 0) {
      console.error(`claim-check --acquire: invalid frozen path(s): ${invalidFrozen.join(', ')}`);
      console.error("  Paths must not contain '..' or start with '/'.");
      process.exit(1);
    }

    // Acquire lock, reload claims, check for conflicts, create only if clear
    const release = await acquireLock('claim-create');
    let acquireResult;
    // C4 (TPL-282): collisionError must be declared OUTSIDE try so it is
    // accessible after the finally block. Declaring inside try would make it
    // out of scope at the post-finally process.exit() call.
    const allowIdCollision = args.has('--allow-id-collision');
    let collisionError = null;
    try {
      const freshClaims = await loadClaims();
      const mergedFresh = federatedDir
        ? mergeFederatedClaims(freshClaims, federatedSets)
        : freshClaims;
      const now = new Date();
      const activeClaims = filterActiveClaims(mergedFresh, now);

      // C4 (TPL-282): slice-ID uniqueness invariant — block if slice is already
      // used by an active claim OR appears in any commit subject across all branches.
      // IMPORTANT: collision errors are collected here (inside the lock), then the
      // lock is released in the finally block BEFORE process.exit() is called.
      // Calling process.exit() inside the try block would skip finally and leave
      // the lockfile on disk, blocking all subsequent --acquire calls.

      if (allowIdCollision && process.env.COA_OPERATOR !== '1') {
        collisionError =
          `claim-check --acquire: --allow-id-collision requires COA_OPERATOR=1 in the environment.\n` +
          `  This flag is for fixup-only scenarios. Normal fixups should use a NEW slice ID.`;
      } else if (slice && slice !== 'unknown' && !allowIdCollision) {
        const resolvedActiveMatch = await findActiveClaimWithSlice(slice, CLAIMS_DIR);
        if (resolvedActiveMatch) {
          collisionError =
            `claim-check --acquire: BLOCKED — slice-id-collision\n` +
            `  active claim ${resolvedActiveMatch.id} already uses slice=${slice}\n` +
            `  acquired_at: ${resolvedActiveMatch.acquiredAt || resolvedActiveMatch.created}\n` +
            `  agent: ${resolvedActiveMatch.agent}\n` +
            `  Pick a different slice ID or wait for that claim to complete/expire.\n` +
            `  Override (rare, fixup-only): pass --allow-id-collision (requires COA_OPERATOR=1).`;
        }

        // Layer 1.5 (TPL-308 / ADR-0036): refuse acquire when a claim with the
        // matching slice has status='completed' AND completed_at within the
        // recent window. Closes the race between pre-commit's --auto-complete
        // (status flip to 'completed') and the moment the commit lands on HEAD,
        // which is when findCommittedSliceUse would start matching. Symmetric
        // with commit-msg-check Layer 1.5 (TPL-298 / ADR-0030).
        if (!collisionError && slice && slice !== 'unknown' && !allowIdCollision) {
          const recentResult = await findRecentClaimWithSlice(
            slice,
            CLAIMS_DIR,
            ACQUIRE_RECENT_WINDOW_S,
          );
          if (recentResult && recentResult.reason === 'completed-recently') {
            const recentClaim = recentResult.claim;
            const commitHashHint = recentClaim.commit_hash
              ? `  commit_hash: ${recentClaim.commit_hash}\n`
              : `  commit_hash: <not yet recorded — likely landing on trunk now>\n`;
            collisionError =
              `claim-check --acquire: BLOCKED — slice-id-collision: recently-completed claim\n` +
              `  claim ${recentClaim.id} for slice=${slice} completed at ${recentClaim.completed_at || '<unknown>'}\n` +
              `  window: ${ACQUIRE_RECENT_WINDOW_S}s (CLAIM_ACQUIRE_RECENT_WINDOW_S to override)\n` +
              commitHashHint +
              `  This protects against the race window between pre-commit --auto-complete\n` +
              `  and the moment the commit lands on HEAD (TPL-308 / ADR-0036).\n` +
              `  Wait a few seconds for the commit to land, then retry — git history\n` +
              `  will then catch the slice and you should pick a different ID.\n` +
              `  Override (rare, fixup-only): pass --allow-id-collision (requires COA_OPERATOR=1).`;
            // Audit log — best-effort observability on every Layer 1.5 refusal.
            await appendAuditEvent({
              ts: new Date().toISOString(),
              event: 'claim-acquire-recent-completed-refuse',
              slice,
              matched_claim: recentClaim.id,
              completed_at: recentClaim.completed_at || null,
              window_seconds: ACQUIRE_RECENT_WINDOW_S,
            });
          }
        }

        if (
          !collisionError &&
          slice &&
          slice !== 'unknown' &&
          !allowIdCollision &&
          process.env.COA_SKIP_HISTORY_CHECK !== '1'
        ) {
          // The history check uses COA_HISTORY_ROOT when set (passed by coa-worktree to
          // force checking the live repo regardless of cwd), otherwise defaults to
          // SCRIPT_ROOT when cwd matches the live repo. Tests in tmpdir repos that do
          // NOT set COA_HISTORY_ROOT will skip the history check to avoid false positives
          // from the live repo's commit history. (TPL-282 / C4)
          const historyRoot =
            process.env.COA_HISTORY_ROOT ||
            (CLAIMS_DIR.replaceAll('\\', '/') === join(SCRIPT_ROOT, '.claims').replaceAll('\\', '/')
              ? SCRIPT_ROOT
              : null);
          const historyMatch = historyRoot ? await findCommittedSliceUse(slice, historyRoot) : null;
          if (historyMatch) {
            const prefix = slice.replace(/-\d+$/, '');
            collisionError =
              `claim-check --acquire: BLOCKED — slice-id-collision\n` +
              `  slice=${slice} already used in commit ${historyMatch.hash}\n` +
              `  subject: ${historyMatch.subject}\n` +
              `  Pick the next free slice ID. Suggest:\n` +
              `    git log --all --oneline | grep -oE "(${prefix}-[0-9]+)" | sort -u`;
          }
        }
      }

      // If collision detected, skip tryAcquireClaim — acquireResult stays undefined.
      // The lock will be released in the finally block; then we exit below.
      if (!collisionError) {
        acquireResult = tryAcquireClaim(
          activeClaims,
          {
            agent,
            slice,
            targets: targetPaths,
            action,
            strategy,
            ttlHours,
            priority,
            dependsOn,
          },
          mainProtectedPaths,
        );

        if (acquireResult.success) {
          // TPL-317 — attach frozen subset to the freshly-built claim BEFORE
          // it lands on disk so `--enforce --staged` sees it on the next read.
          // Only set the field when the operator explicitly passed --frozen
          // with at least one path — keeps legacy / no-frozen claim shapes on
          // disk identical to pre-TPL-317 builds.
          if (frozenPaths.length > 0) {
            acquireResult.claim.frozen = [...frozenPaths];
          }
          const fileName = `${acquireResult.claim.id}.json`;
          const filePath = join(CLAIMS_DIR, fileName);
          await writeFile(filePath, JSON.stringify(acquireResult.claim, null, 2) + '\n', 'utf8');
        }
      }
    } finally {
      await release();
    }

    // Exit after the lock is released to avoid leaving stale lockfiles.
    if (collisionError) {
      console.error(collisionError);
      process.exit(1);
    }

    if (acquireResult.success) {
      // Symmetric audit log entry alongside the lock-protected write above.
      await appendAuditEvent(
        buildAuditEvent({
          event: 'create',
          claim: acquireResult.claim,
          callerAgent: acquireResult.claim.agent,
          decision: { classification: 'self', ageSeconds: 0 },
        }),
      );
      const { claim, overlaps } = acquireResult;
      if (wantJson) {
        console.log(
          JSON.stringify(
            result('claim-check:acquire', true, [], [], {
              claimId: claim.id,
              file: join(CLAIMS_DIR, `${claim.id}.json`),
              overlapCount: overlaps.length,
              claim,
            }),
            null,
            2,
          ),
        );
      } else {
        console.log(`claim-check --acquire: ${claim.id} acquired successfully`);
        if (overlaps.length > 0) {
          console.log(`  INFO: ${overlaps.length} non-blocking overlap(s) noted`);
          for (const o of overlaps) console.log(formatOverlap(o));
        }
      }
    } else {
      const { conflicts, overlaps } = acquireResult;
      if (wantJson) {
        console.log(
          JSON.stringify(
            result('claim-check:acquire', false, [], [], {
              conflictCount: conflicts.length,
              overlapCount: overlaps.length,
              conflicts,
              overlaps,
            }),
            null,
            2,
          ),
        );
      } else {
        console.log(
          `claim-check --acquire: BLOCKED — ${conflicts.length} conflict(s) prevent acquisition`,
        );
        for (const o of conflicts) console.log(formatOverlap(o));
        console.log('');
        console.log('Resolution options:');
        console.log('  1. Wait for the conflicting claim to complete');
        console.log('  2. Use BBA-additive strategy instead (add new export behind seam)');
        console.log('  3. File a counter-claim to negotiate');
        console.log('  4. Use dependsOn to sequence after the blocking claim');
        console.log('  5. Escalate to human');
      }
      process.exit(1);
    }
    return;
  }

  // --extend mode: append additional targets to an existing active claim
  // (TPL-222 J5). Same-agent only — cross-agent extend would silently
  // change another agent's claim scope. Symmetric audit-log entry pairs
  // with --acquire/--create/--force-expire so the log is a full trace.
  const extendMode = args.has('--extend');
  if (extendMode) {
    const targetId = args.get('--id');
    const callerAgent = args.get('--agent');
    const addTargetsRaw = args.get('--add-targets');
    const extendAction = args.get('--action') || 'modify';

    if (!targetId) {
      console.error('claim-check --extend: --id=<claim-id> required');
      console.error(
        '  Usage: --extend --id=<id> --agent=<your-agent> --add-targets=<comma-list> [--action=<modify|extend>]',
      );
      process.exit(1);
    }
    const addTargets =
      typeof addTargetsRaw === 'string'
        ? addTargetsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    const release = await acquireLock('claim-create');
    let extendResult;
    let claimBefore;
    try {
      const freshClaims = await loadClaims();
      claimBefore = freshClaims.find((c) => c.id === targetId);
      extendResult = tryExtendClaim({
        claim: claimBefore,
        callerAgent,
        addTargets,
        action: extendAction,
      });
      if (extendResult.success && extendResult.addedTargets.length > 0) {
        const filePath = join(CLAIMS_DIR, claimBefore._file);
        await writeFile(filePath, JSON.stringify(extendResult.claim, null, 2) + '\n', 'utf8');
      }
    } finally {
      await release();
    }

    if (!extendResult.success) {
      const msg = extendResult.error;
      if (wantJson) {
        console.log(
          JSON.stringify(
            result('claim-check:extend', false, [msg], [], {
              claimId: targetId,
            }),
          ),
        );
      } else {
        console.error(`claim-check --extend: REJECTED — ${msg}`);
        console.error(
          '  Usage: --extend --id=<id> --agent=<your-agent> --add-targets=<comma-list> [--action=<modify|extend>]',
        );
      }
      process.exit(1);
    }

    // Audit-log entry — even no-op (added 0 targets) gets logged so the
    // trace shows when coa-merge attempted an extend.
    const auditEvent = buildAuditEvent({
      event: 'extend',
      claim: extendResult.claim,
      callerAgent,
      decision: { classification: 'self', ageSeconds: 0 },
    });
    auditEvent.addedTargets = extendResult.addedTargets.map((t) => t.path);
    await appendAuditEvent(auditEvent);

    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:extend', true, [], [], {
            claimId: targetId,
            addedCount: extendResult.addedTargets.length,
            addedTargets: extendResult.addedTargets,
            claim: extendResult.claim,
          }),
          null,
          2,
        ),
      );
    } else {
      console.log(
        `claim-check --extend: ${targetId} extended with ${extendResult.addedTargets.length} new target(s)`,
      );
      for (const t of extendResult.addedTargets) {
        console.log(`  + ${t.path} [${t.action}]`);
      }
      if (extendResult.addedTargets.length === 0) {
        console.log('  (no new paths to add — all targets already covered)');
      }
    }
    return;
  }

  // --auto-complete mode: mark claims as completed when (a) the caller is
  // authorized for that specific claim (TPL-223/J3.5 — same-agent by default,
  // cross-agent requires --really + --reason), (b) the work has been
  // verified as actually committed (TPL-223/J3 — HEAD moved, --commit-hash,
  // or --from-pre-commit-hook), and (c) the originally-acquired
  // (non-extended) targets all appear in the proof set (TPL-223/J3.6 —
  // ceremony-extended targets are aspirational and don't gate completion).
  // The CLI shell reads flags, derives the caller agent (with COA_AGENT or
  // active-claim auto-detect fallback for the pre-commit hook), and
  // delegates per-claim gating to verifyAgentAuthorization() and
  // verifyClaimWorkCommitted(). Every accept/skip/reject appends a
  // structured entry to .claims/audit.log so an operator can reconstruct
  // exactly what was completed and why anything was refused.
  const autoCompleteMode = args.has('--auto-complete');
  if (autoCompleteMode) {
    const stagedFiles = args.has('--staged') ? getStagedFiles() : [];
    let callerAgent = (args.get('--agent') || '').trim();
    const commitHash = args.get('--commit-hash') || null;
    const fromPreCommitHook = args.has('--from-pre-commit-hook');
    const hasReally = args.has('--really');
    const reasonArg = (args.get('--reason') || '').trim();

    // Pre-commit-hook agent fallback (J3.5): when the bash hook invokes
    // --auto-complete --from-pre-commit-hook with no explicit --agent, try
    // to derive the agent from the environment, then from the most recent
    // active claim whose targets intersect the staged set. The hook stays
    // simple; agent derivation lives here so coa-merge and operator
    // wrappers don't have to repeat the logic.
    let agentSource = callerAgent ? 'cli-flag' : null;
    if (!callerAgent && fromPreCommitHook) {
      const envAgent = (process.env.COA_AGENT || '').trim();
      if (envAgent) {
        callerAgent = envAgent;
        agentSource = 'env-COA_AGENT';
      } else if (stagedFiles.length > 0) {
        const stagedSet = new Set(stagedFiles.map((f) => String(f).replaceAll('\\', '/')));
        const matching = filterActiveClaims(localClaims, new Date()).filter((c) => {
          const targets = Array.isArray(c.targets) ? c.targets : [];
          return targets.some((t) => stagedSet.has(String(t.path).replaceAll('\\', '/')));
        });
        matching.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
        if (matching.length > 0 && matching[0].agent) {
          callerAgent = matching[0].agent;
          agentSource = 'auto-detect';
        }
      }
    }

    // Layer A (J3.5): refuse outright if no caller agent could be resolved.
    // This is operator/automation error — there's no safe way to gate
    // anything else without it.
    if (!callerAgent) {
      const msg =
        '--agent=<your-agent> is required for --auto-complete --staged (caller must self-identify; J3.5)';
      if (wantJson) {
        console.log(JSON.stringify(result('claim-check:auto-complete', false, [msg]), null, 2));
      } else {
        console.error(`claim-check --auto-complete: REJECTED — ${msg}`);
        console.error(
          '  Pass --agent=<your-agent>, set COA_AGENT env var, or run --from-pre-commit-hook',
        );
        console.error(
          '  against an active claim that covers the staged set so the agent can be auto-detected.',
        );
      }
      process.exit(1);
    }

    // gitCmd is a thin sync wrapper. Built here so unit tests can stub
    // verifyClaimWorkCommitted with their own gitCmd, and so production
    // calls share a single child-process configuration.
    const gitCmd = (gitArgs) =>
      spawnSync('git', gitArgs, { encoding: 'utf8', shell: false, cwd: ROOT });

    // Derive the candidate source set:
    //   - If --commit-hash=<H>, use the files modified by that commit. The
    //     post-commit operator flow has an empty staging set, so we read
    //     the commit's diff-tree instead. Verification (Gate 2 below) also
    //     runs against H, so the loop is consistent.
    //   - Otherwise use the staged file set (the pre-commit-hook flow and
    //     the J3 attack-vector flow both arrive here).
    let sourceFiles = stagedFiles;
    if (commitHash) {
      const exists = gitCmd(['cat-file', '-e', commitHash]);
      if (!exists || exists.status !== 0) {
        const msg = `commit ${commitHash} not found in git log`;
        if (wantJson) {
          console.log(JSON.stringify(result('claim-check:auto-complete', false, [msg]), null, 2));
        } else {
          console.error(`claim-check --auto-complete: REJECTED — ${msg}`);
        }
        process.exit(1);
      }
      const out = gitCmd(['log', '-n', '1', '--format=', '--name-only', commitHash]);
      sourceFiles = String(out?.stdout || '')
        .split(/\r?\n/)
        .map((l) => l.trim().replaceAll('\\', '/'))
        .filter(Boolean);
    }

    // Find every claim whose user-acquired (non-extended) targets are a
    // subset of the source set, regardless of agent — verifyAgentAuthorization
    // gates each one below. We deliberately do NOT pass agent to
    // findCompletableClaims so foreign claims show up in the candidate set
    // and produce audit-log entries (the J3.5 incident left no trace because
    // foreign claims silently got marked completed; the audit trail is the
    // new safety net).
    const candidates = findCompletableClaims(localClaims, sourceFiles);

    const completed = [];
    const skipped = [];
    const rejected = [];

    for (const claim of candidates) {
      // Gate 1 (J3.5): agent authorization.
      const authz = verifyAgentAuthorization({
        claim,
        callerAgent,
        hasReally,
        reason: reasonArg,
      });

      if (!authz.authorized) {
        // Foreign claim, no escalation requested — silent skip + audit.
        // This is the J3.5 prevention path: B's auto-complete sees A's
        // claim but does NOT touch it.
        if (authz.classification === 'cross-agent-no-really') {
          skipped.push({ claim, kind: 'agent-mismatch', reason: authz.reason });
          await appendAuditEvent({
            ts: new Date().toISOString(),
            event: 'auto-complete-rejected',
            claimId: claim.id,
            claimAgent: claim.agent,
            claimSlice: claim.slice,
            callerAgent,
            agentSource,
            verifiedBy: null,
            commitHash: null,
            agentMatch: false,
            crossAgent: false,
            rejectionReason: 'agent-mismatch',
            reason: authz.reason,
          });
          continue;
        }
        // Operator started an override but missed --reason — hard reject.
        rejected.push({ claim, kind: 'cross-agent-no-reason', reason: authz.reason });
        await appendAuditEvent({
          ts: new Date().toISOString(),
          event: 'auto-complete-rejected',
          claimId: claim.id,
          claimAgent: claim.agent,
          claimSlice: claim.slice,
          callerAgent,
          agentSource,
          verifiedBy: null,
          commitHash: null,
          agentMatch: false,
          crossAgent: true,
          rejectionReason: 'cross-agent-no-reason',
          reason: authz.reason,
        });
        continue;
      }

      const sameAgent = authz.classification === 'self';

      // Gate 2 (J3): commit verification.
      const verification = verifyClaimWorkCommitted({
        claim,
        gitCmd,
        commitHash,
        fromPreCommitHook,
      });
      if (!verification.verified) {
        const rejectionReason =
          verification.mode === 'commit-hash' ? 'target-mismatch' : 'head-did-not-move';
        rejected.push({ claim, kind: rejectionReason, reason: verification.reason, verification });
        await appendAuditEvent({
          ts: new Date().toISOString(),
          event: 'auto-complete-rejected',
          claimId: claim.id,
          claimAgent: claim.agent,
          claimSlice: claim.slice,
          callerAgent,
          agentSource,
          verifiedBy: verification.mode,
          commitHash: verification.commitHash || null,
          agentMatch: sameAgent,
          crossAgent: !sameAgent,
          rejectionReason,
          reason: verification.reason,
        });
        continue;
      }

      // Both gates passed — flip status to completed and write success audit.
      // completed_at enables commit-msg-check to accept recently-completed claims
      // that were auto-completed by pre-commit before commit-msg hook fired (TPL-293/ADR-0030).
      const updated = { ...claim, status: 'completed', completed_at: new Date().toISOString() };
      delete updated._file;
      const filePath = join(CLAIMS_DIR, claim._file);
      await writeFile(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

      await appendAuditEvent({
        ts: new Date().toISOString(),
        event: 'auto-complete',
        claimId: claim.id,
        claimAgent: claim.agent,
        claimSlice: claim.slice,
        callerAgent,
        agentSource,
        verifiedBy: verification.mode,
        commitHash: verification.commitHash || null,
        agentMatch: sameAgent,
        crossAgent: !sameAgent,
        reason: !sameAgent ? reasonArg : null,
      });

      completed.push({ claim, verification, sameAgent });
    }

    const completedCount = completed.length;
    const skippedCount = skipped.length;
    const rejectedCount = rejected.length;

    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:auto-complete', rejectedCount === 0, [], [], {
            completedCount,
            skippedCount,
            rejectedCount,
            callerAgent,
            agentSource,
            rejected: rejected.map((r) => ({
              id: r.claim.id,
              agent: r.claim.agent,
              slice: r.claim.slice,
              kind: r.kind,
              reason: r.reason,
            })),
            skipped: skipped.map((s) => ({
              id: s.claim.id,
              agent: s.claim.agent,
              slice: s.claim.slice,
              kind: s.kind,
            })),
          }),
          null,
          2,
        ),
      );
    } else {
      if (rejectedCount > 0) {
        console.error(`claim-check --auto-complete: ${rejectedCount} claim(s) REJECTED`);
        for (const r of rejected) {
          console.error(
            `  REJECTED: ${r.claim.id} (${r.claim.agent}, ${r.claim.slice}) [${r.kind}]`,
          );
          console.error(`    reason: ${r.reason}`);
        }
        console.error(
          '  J3 (work not committed): pass --commit-hash=<hash>, run --from-pre-commit-hook,',
        );
        console.error('  or commit your slice first then retry.');
        console.error(
          '  J3.5 (cross-agent override): pass --really --reason="<text>" if intentionally',
        );
        console.error("  completing another agent's claim.");
      }
      console.log(
        `claim-check --auto-complete: ${completedCount} completed, ${skippedCount} skipped (foreign), ${rejectedCount} rejected`,
      );
      for (const c of completed) {
        const flag = c.sameAgent ? '' : ' [cross-agent]';
        console.log(`  COMPLETED: ${c.claim.id} (${c.claim.agent}, ${c.claim.slice})${flag}`);
      }
      for (const s of skipped) {
        console.log(
          `  SKIPPED: ${s.claim.id} (${s.claim.agent}, ${s.claim.slice}) [foreign-agent]`,
        );
      }
    }

    if (rejectedCount > 0) process.exit(1);
    return;
  }

  // --auto-expire mode: write "expired" status to stale claim files (local only)
  const autoExpireMode = args.has('--auto-expire');
  if (autoExpireMode) {
    const now = new Date();
    const stale = auditStaleClaims(localClaims, now);
    let expiredCount = 0;
    for (const claim of stale) {
      const updated = markClaimExpired(claim);
      const filePath = join(CLAIMS_DIR, claim._file);
      await writeFile(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
      expiredCount++;
    }
    if (wantJson) {
      console.log(
        JSON.stringify(result('claim-check:auto-expire', true, [], [], { expiredCount }), null, 2),
      );
    } else {
      console.log(`claim-check --auto-expire: ${expiredCount} claim(s) expired`);
      for (const c of stale) console.log(`  EXPIRED: ${c.id} (${c.agent}, ${c.slice})`);
    }
    return;
  }

  // --force-expire mode: expire a specific claim by ID, gated by the
  // TPL-221 authorization model (same-agent default, cross-agent escape with
  // --really + --reason, young-claim guard, audit log).
  const forceExpireMode = args.has('--force-expire');
  if (forceExpireMode) {
    const targetId = args.get('--id');
    if (!targetId) {
      console.error('claim-check --force-expire: --id=<claim-id> required');
      console.error(
        '  Usage: --force-expire --id=<id> --agent=<your-agent> [--really] [--reason="<text>"]',
      );
      process.exit(1);
    }
    const claim = localClaims.find((c) => c.id === targetId);
    if (!claim) {
      const msg = `claim ${targetId} not found`;
      if (wantJson) console.log(JSON.stringify(result('claim-check:force-expire', false, [msg])));
      else console.error(`claim-check --force-expire: ${msg}`);
      process.exit(1);
    }
    if (claim.status === 'completed' || claim.status === 'abandoned') {
      const msg = `claim ${targetId} is already ${claim.status} — no action needed`;
      if (wantJson) {
        console.log(
          JSON.stringify(
            result('claim-check:force-expire', true, [], [msg], {
              claimId: targetId,
              status: claim.status,
            }),
          ),
        );
      } else console.log(`claim-check --force-expire: ${msg}`);
      return;
    }

    const callerAgent = args.get('--agent');
    const hasReally = args.has('--really');
    const reason = args.get('--reason');
    const now = new Date();
    const decision = validateForceExpireRequest({ claim, callerAgent, hasReally, reason, now });

    if (!decision.allowed) {
      const msg = decision.error;
      if (wantJson) {
        console.log(
          JSON.stringify(
            result('claim-check:force-expire', false, [msg], [], {
              claimId: targetId,
              classification: decision.classification,
              ageSeconds: decision.ageSeconds,
            }),
          ),
        );
      } else {
        console.error(`claim-check --force-expire: REJECTED — ${msg}`);
        console.error(
          '  Usage: --force-expire --id=<id> --agent=<your-agent> [--really] [--reason="<text>"]',
        );
        if (decision.classification === 'cross-agent') {
          console.error(
            '  Cross-agent override requires both --really and --reason="<short text>".',
          );
        } else if (decision.classification === 'young-claim-override') {
          console.error(
            `  Same-agent override on a claim younger than ${MIN_FORCE_EXPIRE_AGE_MINUTES} min requires --really.`,
          );
        }
      }
      process.exit(1);
    }

    // TPL-225: cross-agent overrides must pass a structured abandoned-check
    // BEFORE the file is mutated. validateForceExpireRequest validated the
    // *form* of the override (--really + --reason); checkClaimAbandoned
    // validates the *facts* on the ground (age, git activity, stash). Same-
    // and young-claim-override classifications are unchanged — the agent
    // already knows their own state.
    let abandonedCheck = null;
    let operatorConfirmed = false;
    if (decision.classification === 'cross-agent') {
      abandonedCheck = checkClaimAbandoned({
        claim,
        gitCmd: (a) => spawnSync('git', a, { encoding: 'utf8', shell: false, cwd: ROOT }),
        stashCmd: (a) =>
          spawnSync('git', ['stash', ...a], { encoding: 'utf8', shell: false, cwd: ROOT }),
        now,
      });

      const operatorEnv = process.env.COA_OPERATOR === '1';
      const operatorFlag = args.has('--operator-confirmed');
      operatorConfirmed = operatorFlag && operatorEnv;

      const needsOperator =
        abandonedCheck.confidence === ABANDONED_CONFIDENCE.LOW ||
        abandonedCheck.confidence === ABANDONED_CONFIDENCE.MEDIUM;

      if (needsOperator && !operatorConfirmed) {
        const tier = abandonedCheck.confidence;
        const why =
          tier === ABANDONED_CONFIDENCE.LOW
            ? 'abandoned-check signals show the claim is alive'
            : 'abandoned-check signals are inconclusive';
        const operatorHint = !operatorFlag
          ? 'pass --operator-confirmed (and export COA_OPERATOR=1) to confirm at the keyboard'
          : !operatorEnv
            ? 'COA_OPERATOR=1 must be exported in the operator shell — agents cannot fake this'
            : 'operator confirmation missing';
        const msg = `${why} [confidence=${tier}]; ${operatorHint}`;

        const rejectionEvent = buildAuditEvent({
          event: 'force-expire-rejected',
          claim,
          callerAgent,
          reason,
          decision,
          now,
          abandonedCheck,
          operatorConfirmed,
        });
        rejectionEvent.rejectionReason = `abandoned-check-${tier}`;
        await appendAuditEvent(rejectionEvent);

        if (wantJson) {
          console.log(
            JSON.stringify(
              result('claim-check:force-expire', false, [msg], [], {
                claimId: targetId,
                classification: decision.classification,
                ageSeconds: decision.ageSeconds,
                abandonedCheck,
                operatorConfirmed,
              }),
            ),
          );
        } else {
          console.error(`claim-check --force-expire: REJECTED — ${msg}`);
          console.error(`  abandoned-check confidence: ${tier}`);
          for (const s of abandonedCheck.signals) console.error(`    signal: ${s}`);
          console.error('  Operator path:');
          console.error(
            '    1. Verify the claim is truly abandoned (see .claims/README.md "Force-expiring claims").',
          );
          console.error('    2. In the operator shell: export COA_OPERATOR=1');
          console.error('    3. Re-run with --operator-confirmed.');
        }
        process.exit(1);
      }
    }

    const updated = markClaimExpired(claim);
    const filePath = join(CLAIMS_DIR, claim._file);
    await writeFile(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

    const auditEvent = buildAuditEvent({
      event: 'force-expire',
      claim,
      callerAgent,
      reason,
      decision,
      now,
      abandonedCheck,
      operatorConfirmed,
    });
    await appendAuditEvent(auditEvent);

    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:force-expire', true, [], [], {
            claimId: targetId,
            agent: claim.agent,
            slice: claim.slice,
            targets: (claim.targets || []).map((t) => t.path),
            classification: decision.classification,
            ageSeconds: decision.ageSeconds,
            abandonedCheck,
            operatorConfirmed,
            auditEvent,
          }),
          null,
          2,
        ),
      );
    } else {
      console.log(
        `claim-check --force-expire: expired ${targetId} (${claim.agent}, ${claim.slice}) [${decision.classification}]`,
      );
      for (const t of claim.targets || []) console.log(`  target: ${t.path}`);
      if (abandonedCheck) {
        console.log(
          `  abandoned-check: confidence=${abandonedCheck.confidence}${operatorConfirmed ? ' (operator-confirmed)' : ''}`,
        );
        for (const s of abandonedCheck.signals) console.log(`    signal: ${s}`);
      }
      console.log(
        `  audit: .claims/${AUDIT_LOG_FILE} (${auditEvent.event} by ${auditEvent.callerAgent})`,
      );
    }
    return;
  }

  // --clean-expired mode: operator-gated physical deletion of stale claim
  // files (TPL-309 / ADR-0037). Deletes status=expired immediately; deletes
  // status=completed older than --keep-completed-days (default 30). Active
  // claims are never touched. Example claims (id prefix `clm-ex`) are spared.
  // Audit log entry is written before unlink so a crash mid-cleanup leaves
  // a complete trail. --dry-run prints the would-delete list without writing.
  const cleanExpiredMode = args.has('--clean-expired');
  if (cleanExpiredMode) {
    if (process.env.COA_OPERATOR !== '1') {
      const msg = '--clean-expired requires COA_OPERATOR=1 (destructive operation)';
      if (wantJson) {
        console.log(JSON.stringify(result('claim-check:clean-expired', false, [msg])));
      } else {
        console.error(`claim-check --clean-expired: REJECTED — ${msg}`);
        console.error('  Export COA_OPERATOR=1 in the operator shell, then re-run.');
      }
      process.exit(1);
    }

    const dryRun = args.has('--dry-run');
    const keepCompletedDays = Number(args.get('--keep-completed-days') ?? 30);
    if (!Number.isFinite(keepCompletedDays) || keepCompletedDays < 0) {
      const msg = `--keep-completed-days must be a non-negative number (got ${args.get('--keep-completed-days')})`;
      if (wantJson) console.log(JSON.stringify(result('claim-check:clean-expired', false, [msg])));
      else console.error(`claim-check --clean-expired: ${msg}`);
      process.exit(1);
    }
    const completedCutoffMs = Date.now() - keepCompletedDays * 24 * 60 * 60 * 1000;

    const toDelete = [];
    for (const claim of localClaims) {
      if (isExampleClaim(claim)) continue;
      if (claim.status === 'expired') {
        toDelete.push({ claim, reason: 'status=expired' });
      } else if (claim.status === 'completed') {
        const completedAt = claim.completed_at ? new Date(claim.completed_at).getTime() : 0;
        if (completedAt > 0 && completedAt < completedCutoffMs) {
          toDelete.push({
            claim,
            reason: `completed > ${keepCompletedDays} days ago`,
          });
        }
      }
    }

    if (dryRun) {
      if (wantJson) {
        console.log(
          JSON.stringify(
            result('claim-check:clean-expired', true, [], [], {
              dryRun: true,
              candidateCount: toDelete.length,
              candidates: toDelete.map((d) => ({
                id: d.claim.id,
                slice: d.claim.slice,
                agent: d.claim.agent,
                status: d.claim.status,
                reason: d.reason,
              })),
              keepCompletedDays,
            }),
            null,
            2,
          ),
        );
      } else {
        console.log(
          `claim-check --clean-expired: DRY RUN — would delete ${toDelete.length} claim file(s)`,
        );
        for (const d of toDelete) {
          console.log(
            `  ${d.claim.id} (${d.reason}): slice=${d.claim.slice}, agent=${d.claim.agent}`,
          );
        }
      }
      return;
    }

    let deletedCount = 0;
    const deleted = [];
    for (const d of toDelete) {
      const filePath = join(CLAIMS_DIR, d.claim._file);
      // Audit BEFORE unlink so a crash mid-cleanup preserves the trail.
      await appendAuditEvent({
        ts: new Date().toISOString(),
        event: 'claim-clean-expired',
        claimId: d.claim.id,
        slice: d.claim.slice,
        agent: d.claim.agent,
        status: d.claim.status,
        reason: d.reason,
      });
      try {
        await unlinkFile(filePath);
        deletedCount++;
        deleted.push({
          id: d.claim.id,
          slice: d.claim.slice,
          agent: d.claim.agent,
          status: d.claim.status,
          reason: d.reason,
        });
      } catch {
        /* file already gone — audit entry remains as record of attempt */
      }
    }

    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:clean-expired', true, [], [], {
            deletedCount,
            deleted,
            keepCompletedDays,
          }),
          null,
          2,
        ),
      );
    } else {
      console.log(`claim-check --clean-expired: deleted ${deletedCount} claim file(s)`);
      for (const d of deleted) {
        console.log(`  DELETED: ${d.id} (${d.reason}): slice=${d.slice}, agent=${d.agent}`);
      }
    }
    return;
  }

  // --prune mode: delete completed/expired/abandoned claim files. Tracked
  // example claims (id prefix `clm-ex`) are spared — they are documentation
  // and must survive the lifecycle. See isExampleClaim().
  const pruneMode = args.has('--prune');
  if (pruneMode) {
    const PRUNABLE_STATUSES = new Set(['completed', 'expired', 'abandoned']);
    let prunedCount = 0;
    let sparedCount = 0;
    for (const claim of localClaims) {
      if (!PRUNABLE_STATUSES.has(claim.status)) continue;
      if (isExampleClaim(claim)) {
        sparedCount++;
        if (!wantJson) console.log(`  SPARED: ${claim.id} (example claim, kept as documentation)`);
        continue;
      }
      const filePath = join(CLAIMS_DIR, claim._file);
      await unlinkFile(filePath).catch(() => {});
      prunedCount++;
      if (!wantJson) console.log(`  PRUNED: ${claim.id} (${claim.status})`);
    }
    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:prune', true, [], [], { prunedCount, sparedCount }),
          null,
          2,
        ),
      );
    } else {
      console.log(
        `claim-check --prune: ${prunedCount} claim file(s) deleted, ${sparedCount} example(s) spared`,
      );
    }
    return;
  }

  // --query=<path> mode: show active claims targeting a specific file
  const queryPath = args.get('--query');
  if (queryPath) {
    const now = new Date();
    const matches = queryActiveClaimsForPath(allClaims, queryPath, now);
    const negotiations = detectNegotiations(matches);
    const { ready, blocked } = classifyClaimReadiness(matches, allClaims);
    // TPL-317 — surface a FROZEN flag whenever queryPath sits inside any
    // active claim's frozen list. Independent of `targets` (the path may be
    // declared frozen without being in `targets` at all — that is the
    // canonical "I read this but must not write it" use case).
    const normQueryPath = queryPath.replaceAll('\\', '/');
    const activeAll = filterActiveClaims(allClaims, now);
    const frozenClaims = activeAll.filter((c) => {
      const f = Array.isArray(c.frozen) ? c.frozen : [];
      return f.some((p) => String(p).replaceAll('\\', '/') === normQueryPath);
    });
    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:query', true, [], [], {
            path: queryPath,
            activeClaimCount: matches.length,
            negotiateCount: negotiations.length,
            readyCount: ready.length,
            blockedCount: blocked.length,
            claims: matches,
            blocked,
            frozenClaimCount: frozenClaims.length,
            frozenClaims,
          }),
          null,
          2,
        ),
      );
    } else {
      console.log(`claim-check --query: ${matches.length} active claim(s) on ${queryPath}`);
      for (const c of matches) {
        const target = (c.targets || []).find(
          (t) => String(t.path).replaceAll('\\', '/') === queryPath.replaceAll('\\', '/'),
        );
        const claimAction = target ? target.action : 'unknown';
        const negotiate = c.strategy === 'negotiate' ? ' [NEGOTIATE]' : '';
        const repo = c._repo && c._repo !== 'local' ? ` [${c._repo}]` : '';
        console.log(`  ${c.id} (${c.agent}, ${c.slice}) [${claimAction}]${negotiate}${repo}`);
        if (c.counterTo) console.log(`    counter-claim against: ${c.counterTo}`);
      }
      if (frozenClaims.length > 0) {
        console.log('');
        console.log(`  FROZEN: ${frozenClaims.length} active claim(s) freeze ${queryPath}`);
        for (const c of frozenClaims) {
          console.log(`    ${c.id} (${c.agent}, ${c.slice})`);
        }
      }
      if (blocked.length > 0) {
        console.log('');
        console.log(`  BLOCKED: ${blocked.length} claim(s) waiting on dependencies`);
        for (const b of blocked) {
          console.log(`    ${b.claim.id} blocked by: ${b.blockedBy.join(', ')}`);
        }
      }
      if (negotiations.length > 0) {
        console.log('');
        console.log(
          `  WARNING: ${negotiations.length} claim(s) require negotiation — human decision may be needed`,
        );
      }
    }
    return;
  }

  // --audit mode: report stale claims, dependency ordering, federated status,
  // and the last 50 audit-log events (TPL-221 — surfaces force-expire history
  // and creation trace alongside stale-claim listings).
  if (auditMode) {
    const now = new Date();
    const stale = auditStaleClaims(allClaims, now);
    const activeClaims = filterActiveClaims(allClaims, now);
    const { cycles } = resolveDependencyOrder(activeClaims);
    const { ready, blocked } = classifyClaimReadiness(activeClaims, allClaims);
    const warnings = stale.map(
      (c) => `Stale claim ${c.id} (${c.agent}, ${c.slice}) expired at ${c.expires}`,
    );
    const auditEvents = await readRecentAuditEvents(50);
    // TPL-317 — per-claim frozen-paths summary. Legacy claims (no `frozen`
    // field) report frozenCount=0 so the JSON output shape is uniform across
    // pre/post-TPL-317 corpora. The summary preserves all original claim
    // fields so existing consumers see no behaviour change.
    const activeClaimsWithFrozen = activeClaims.map((c) => ({
      ...c,
      frozenCount: Array.isArray(c.frozen) ? c.frozen.length : 0,
    }));
    const totalFrozenPaths = activeClaimsWithFrozen.reduce((n, c) => n + c.frozenCount, 0);

    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check:audit', true, [], warnings, {
            staleCount: stale.length,
            stale,
            activeCount: activeClaims.length,
            readyCount: ready.length,
            blockedCount: blocked.length,
            blocked,
            cycleCount: cycles.length,
            cycles,
            federatedSources: federatedSets.map((s) => s.repoId),
            auditEventCount: auditEvents.length,
            auditEvents,
            activeClaims: activeClaimsWithFrozen,
            frozenPathCount: totalFrozenPaths,
          }),
          null,
          2,
        ),
      );
    } else {
      console.log(`claim-check --audit: ${stale.length} stale, ${activeClaims.length} active`);
      for (const w of warnings) console.log(`  STALE: ${w}`);
      if (blocked.length > 0) {
        console.log('');
        console.log(`  BLOCKED: ${blocked.length} claim(s) waiting on dependencies`);
        for (const b of blocked) {
          console.log(`    ${b.claim.id} (${b.claim.agent}) blocked by: ${b.blockedBy.join(', ')}`);
        }
      }
      if (cycles.length > 0) {
        console.log('');
        console.log(`  CYCLE: ${cycles.length} dependency cycle(s) detected`);
        for (const cycle of cycles) {
          console.log(`    ${cycle.join(' <-> ')}`);
        }
      }
      if (ready.length > 0) {
        console.log('');
        console.log(`  READY: ${ready.length} claim(s) can proceed (dependencies resolved)`);
        const depOrdered = resolveDependencyOrder(ready);
        for (const c of depOrdered.ordered) {
          const repo = c._repo && c._repo !== 'local' ? ` [${c._repo}]` : '';
          console.log(`    ${c.id} (${c.agent}, ${c.slice})${repo}`);
        }
      }
      if (federatedSets.length > 0) {
        console.log('');
        console.log(`  FEDERATED: ${federatedSets.length} external source(s)`);
        for (const s of federatedSets) {
          const count = s.claims.length;
          console.log(`    ${s.repoId}: ${count} claim(s)`);
        }
      }
      if (auditEvents.length > 0) {
        console.log('');
        console.log(
          `  AUDIT LOG: last ${auditEvents.length} event(s) from .claims/${AUDIT_LOG_FILE}`,
        );
        for (const ev of auditEvents) {
          const flags = [
            ev.crossAgent ? 'cross-agent' : null,
            ev.youngClaimOverride ? 'young-claim-override' : null,
          ]
            .filter(Boolean)
            .join(', ');
          const flagStr = flags ? ` [${flags}]` : '';
          const reasonStr = ev.reason ? ` — "${ev.reason}"` : '';
          console.log(
            `    ${ev.ts}  ${ev.event}  ${ev.claimId}  by ${ev.callerAgent}${flagStr}${reasonStr}`,
          );
        }
      }
      // TPL-317 — per-claim frozen-paths line. Suppressed entirely when no
      // active claim declares a frozen list, so audit output for legacy
      // corpora stays unchanged.
      if (totalFrozenPaths > 0) {
        console.log('');
        console.log(
          `  FROZEN PATHS: ${totalFrozenPaths} declaration(s) across ${activeClaimsWithFrozen.filter((c) => c.frozenCount > 0).length} claim(s)`,
        );
        for (const c of activeClaimsWithFrozen) {
          if (c.frozenCount === 0) continue;
          console.log(`    ${c.id} (${c.agent}, ${c.slice}) — frozenCount=${c.frozenCount}`);
        }
      }
    }
    return;
  }

  // --targets or --staged mode
  const stagedMode = args.has('--staged');
  const enforceMode = args.has('--enforce');
  const stagedFiles = stagedMode ? getStagedFiles() : [];
  const targets = stagedMode
    ? stagedFiles
    : typeof targetsRaw === 'string'
      ? targetsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
  const now = new Date();
  const activeClaims = filterActiveClaims(allClaims, now);

  if (targets.length === 0) {
    // No specific targets — report active claims with dependency ordering
    const { ordered, cycles } = resolveDependencyOrder(activeClaims);
    const { ready, blocked } = classifyClaimReadiness(activeClaims, allClaims);
    if (wantJson) {
      console.log(
        JSON.stringify(
          result('claim-check', true, [], [], {
            activeClaimCount: activeClaims.length,
            activeClaims,
            readyCount: ready.length,
            blockedCount: blocked.length,
            blocked,
            cycleCount: cycles.length,
            cycles,
          }),
          null,
          2,
        ),
      );
    } else {
      console.log(`claim-check: ${activeClaims.length} active claim(s)`);
      for (const c of ordered) {
        const paths = (c.targets || []).map((t) => t.path).join(', ');
        const repo = c._repo && c._repo !== 'local' ? ` [${c._repo}]` : '';
        console.log(`  [${c.strategy}] ${c.id} (${c.agent}, ${c.slice}) -> ${paths}${repo}`);
      }
      if (blocked.length > 0) {
        console.log('');
        console.log(`  BLOCKED: ${blocked.length} claim(s) waiting on dependencies`);
        for (const b of blocked) {
          console.log(`    ${b.claim.id} blocked by: ${b.blockedBy.join(', ')}`);
        }
      }
      if (cycles.length > 0) {
        console.log('');
        console.log(`  CYCLE: ${cycles.length} dependency cycle(s) detected`);
        for (const cycle of cycles) {
          console.log(`    ${cycle.join(' <-> ')}`);
        }
      }
    }
    return;
  }

  // In --enforce --staged mode, pass stagedFiles as selfStagedFiles so the
  // committer's own claim is filtered (it authorizes the current commit) while
  // claims from other parallel sessions are still surfaced as conflicts.
  const selfStagedForDetect = enforceMode && stagedMode ? stagedFiles : null;
  const overlaps = detectOverlaps(
    activeClaims,
    targets,
    action,
    mainProtectedPaths,
    selfStagedForDetect,
  );
  const conflicts = overlaps.filter((o) => o.severity === 'conflict');
  const warnings = overlaps.map(
    (o) =>
      `${o.severity}: ${o.claimId} overlaps with ${o.path} [${o.claimAction} vs ${o.intendedAction}]`,
  );

  if (wantJson) {
    console.log(
      JSON.stringify(
        result('claim-check', true, [], warnings, {
          targets,
          action,
          overlapCount: overlaps.length,
          conflictCount: conflicts.length,
          overlaps,
        }),
        null,
        2,
      ),
    );
  } else {
    if (overlaps.length === 0) {
      console.log(`claim-check: no overlaps with ${targets.length} target(s) — clear to proceed`);
    } else {
      console.log(`claim-check: ${overlaps.length} overlap(s) with your intended targets`);
      for (const o of overlaps) {
        console.log(formatOverlap(o));
      }
      // Flag negotiate claims prominently (Phase 3)
      const negotiations = detectNegotiations(activeClaims);
      if (negotiations.length > 0) {
        console.log('');
        console.log(`NEGOTIATE: ${negotiations.length} claim(s) require negotiation`);
        for (const n of negotiations) {
          const paths = (n.targets || []).map((t) => t.path).join(', ');
          const counter = n.counterTo ? ` (counter to ${n.counterTo})` : '';
          console.log(`  ${n.id} (${n.agent}, ${n.slice}) -> ${paths}${counter}`);
        }
        // Show priority ordering for negotiate claims
        const ordered = resolveByPriority(negotiations);
        console.log('  Priority order:');
        for (let i = 0; i < ordered.length; i++) {
          console.log(`    ${i + 1}. ${ordered[i].id} [${ordered[i].priority || 'medium'}]`);
        }
      }

      // Show dependency status for overlapping claims (Phase 4)
      const { blocked } = classifyClaimReadiness(activeClaims, allClaims);
      if (blocked.length > 0) {
        console.log('');
        console.log(`  BLOCKED: ${blocked.length} claim(s) waiting on dependencies`);
        for (const b of blocked) {
          console.log(`    ${b.claim.id} blocked by: ${b.blockedBy.join(', ')}`);
        }
      }

      if (conflicts.length > 0) {
        console.log('');
        console.log('Resolution options:');
        console.log('  1. Wait for the conflicting claim to complete');
        console.log('  2. Use BBA-additive strategy instead (add new export behind seam)');
        console.log('  3. File a counter-claim to negotiate (claim-check will report priority)');
        console.log('  4. Use dependsOn to sequence after the blocking claim');
        console.log('  5. Escalate to human');
      }
    }
  }

  // TPL-317 — frozen-paths enforcement (P4 defense-in-depth for F12). Runs in
  // --enforce --staged mode so the pre-commit hook refuses to ship a diff
  // that touches a path declared off-limits inside any active claim's
  // `frozen` list. Two-factor override required to proceed: COA_OPERATOR=1
  // env var AND a `Allow-frozen-write: <reason ≥3 chars>` line in the
  // commit-message body (.git/COMMIT_EDITMSG).
  if (enforceMode && stagedMode && stagedFiles.length > 0) {
    const frozenViolations = checkFrozenPathsViolations(stagedFiles, activeClaims);
    if (frozenViolations.length > 0) {
      const operatorEnv = process.env.COA_OPERATOR === '1';
      const editMsgPath = await resolveCommitEditMsgPath();
      let commitMsg = '';
      if (editMsgPath) {
        try {
          commitMsg = await readFile(editMsgPath, 'utf8');
        } catch {
          /* missing/empty COMMIT_EDITMSG → reason stays empty → block */
        }
      }
      const reason = extractFrozenOverrideReason(commitMsg);

      if (operatorEnv && reason) {
        process.stderr.write(`[claim-check] frozen-paths override accepted: ${reason}\n`);
        // Audit log — best-effort observability of every override use.
        await appendAuditEvent({
          ts: new Date().toISOString(),
          event: 'frozen-override-accepted',
          reason,
          violations: frozenViolations,
        });
      } else {
        if (wantJson) {
          console.error(
            JSON.stringify(
              {
                advisory: 'frozen-paths',
                violations: frozenViolations,
                operatorEnv,
                hasReason: Boolean(reason),
              },
              null,
              2,
            ),
          );
        } else {
          console.log('');
          console.log(
            `  FROZEN: ${frozenViolations.length} staged file(s) match a claim's frozen list:`,
          );
          for (const v of frozenViolations) {
            console.log(`    ${v.path} (claim ${v.claimId}, slice ${v.slice}, agent ${v.agent})`);
          }
          console.log('');
          console.log('  To override BOTH factors are required:');
          console.log('    1. Set COA_OPERATOR=1 in your environment.');
          console.log(
            '    2. Add `Allow-frozen-write: <reason ≥3 chars>` to the commit-message body.',
          );
          if (!operatorEnv) console.log('  Currently: COA_OPERATOR is NOT set.');
          if (!reason) {
            console.log('  Currently: Allow-frozen-write line missing or reason is too short.');
          }
        }
        process.exit(1);
      }
    }
  }

  // Protected-path advisory warnings (Phase 5).
  // Reuses the protectedPaths list resolved at the top of main() so that
  // overlap escalation and the advisory check share one source of truth.
  if (enforceMode && stagedMode && stagedFiles.length > 0) {
    const protectedPathMode = (protectedConfig && protectedConfig.protectedPathMode) || 'block';
    const protectedWarnings = checkProtectedPaths(stagedFiles, activeClaims, mainProtectedPaths);
    if (protectedWarnings.length > 0) {
      const isBlocking = protectedPathMode === 'block';
      const label = isBlocking ? 'BLOCKED' : 'ADVISORY';
      if (wantJson) {
        console.error(
          JSON.stringify(
            { advisory: 'protected-path', mode: protectedPathMode, warnings: protectedWarnings },
            null,
            2,
          ),
        );
      } else {
        console.log('');
        console.log(
          `  ${label}: ${protectedWarnings.length} staged file(s) match protected paths without active claims:`,
        );
        for (const w of protectedWarnings) {
          console.log(`    ${w.path} (matches ${w.pattern})`);
        }
        if (isBlocking) {
          console.log(
            '  Set "protectedPathMode": "warn" in .claims/config.json to downgrade to advisory.',
          );
        }
      }
      if (isBlocking) {
        process.exit(1);
      }
    }
  }

  // --enforce: exit 1 on blocking conflicts (Phase 2)
  if (enforceMode && hasBlockingConflicts(overlaps)) {
    process.exit(1);
  }
}

// Only run main() when executed directly (not imported for testing)
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('claim-check.mjs') || process.argv[1].endsWith('claim-check'));

if (isDirectRun) {
  main().catch((error) => {
    console.error('claim-check: fatal error:', error.message || error);
    process.exit(1);
  });
}
