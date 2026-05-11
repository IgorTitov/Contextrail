/* @HEADER
 * @version 0.8.5 | 2026-05-11
 * @purpose Pure helpers for R2 / ADR-0017 transport-branch enforcement — name validation, marker file shape, age thresholds, ff-update method classification (F12). No git, no I/O.
 * @sidecar transport-branch.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R2 — transport-branch enforcement (pure logic).
 *
 * Every commit must land either:
 *   (a) directly on trunk (`main` / `master`), OR
 *   (b) on a transport branch matching `tx-<slice-id>` shape.
 *
 * This file owns the small, easy-to-pin invariants that the checker
 * (scripts/checks/transport-branch-check.mjs) and the worktree creator
 * (scripts/coa-worktree.mjs --create --slice=) both depend on:
 *
 *   - branch name regex (allow tx-<id>, refuse feature/, *-backport, etc.)
 *   - merge marker file path + JSON shape + parser
 *   - age thresholds (warn/refuse) with a small verdict helper
 *
 * No git invocations, no filesystem reads. Tests pin every transition
 * directly. ADR-0017 documents the anti-evasion matrix this layer
 * supports.
 *
 * @see docs/adr/0017-transport-branch-enforcement.md
 */

// ---------------------------------------------------------------------------
// Branch-name validation
// ---------------------------------------------------------------------------

/**
 * The accepted transport-branch name shape:
 *   tx-<UPPER_PROJECT>-<DIGITS>(-<lower-suffix>)?
 *
 * Examples:
 *   tx-TPL-234            → standard
 *   tx-AIC-088            → Cockpit-flavoured
 *   tx-ZVX-053            → Zvenix-flavoured
 *   tx-TPL-227-interim    → suffixed variant (matches the ID-with-suffix
 *                           shape that spec-check accepts; F8 in
 *                           Entry 022 is a separate spec-check fix)
 *
 * The project prefix MUST start uppercase and the digits MUST be at
 * least one. The optional suffix is lowercase letters only — a hyphen
 * separator plus 1+ chars. We reject lower-case `tx-tpl-234` so the
 * canonical capitalisation rule is observable; a relaxed regex would
 * silently accept arbitrary casing and confuse `extractSliceFromTransportName`.
 */
// Multi-segment prefix support (TPL-303 / ADR-0033):
//   tx-TPL-234, tx-AIC-DEV-167, tx-RELEASE-Q1-FEAT-008
// The prefix segments are separated by hyphens; the final hyphen-then-digits
// component is the slice number. Suffix (-lowercase) remains optional.
// Single-segment (e.g. tx-TPL-234, tx-X-1) is still the industry default;
// first segment allows a single letter ([A-Z][A-Z0-9]*) for backward compat.
const TRANSPORT_BRANCH_RE = /^tx-([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]+)*)-(\d+)(-[a-z][a-z0-9]*)?$/;

/**
 * Trunk branch names recognized by R2. Stays narrow on purpose so an
 * operator cannot rename `main` to `main2` and have it pass as trunk.
 */
const TRUNK_BRANCH_NAMES = Object.freeze(['main', 'master']);

/**
 * Names that are actively rejected with helpful error context. The
 * checker matches each pattern in turn and returns the first hit so
 * the operator gets a specific message instead of "not a transport
 * branch".
 *
 * Each entry is { match: RegExp, reason: string } — `reason` is the
 * one-line explanation; the checker formats it into a multi-line
 * message with the canonical fix.
 */
export const BANNED_BRANCH_PATTERNS = Object.freeze([
  Object.freeze({
    match: /^feature\//i,
    reason: 'feature/ branches violate trunk-based delivery (ADR-0002)',
  }),
  Object.freeze({
    match: /^feat\//i,
    reason: 'feat/ branches violate trunk-based delivery (ADR-0002)',
  }),
  Object.freeze({
    match: /^fix\//i,
    reason: 'fix/ branches violate trunk-based delivery (ADR-0002)',
  }),
  Object.freeze({
    match: /-backport$/i,
    reason: '*-backport branches were the 2026-04 anti-pattern R2 closes',
  }),
  Object.freeze({
    match: /^backport-/i,
    reason: 'backport-* branches were the 2026-04 anti-pattern R2 closes',
  }),
]);

/**
 * Is `name` a syntactically valid transport-branch name?
 *
 * Pure check — does not consult git, does not verify the branch exists.
 */
export function isTransportBranchName(name) {
  if (typeof name !== 'string') return false;
  return TRANSPORT_BRANCH_RE.test(name);
}

/**
 * Is `name` a recognized trunk branch (`main` or `master`)?
 */
export function isTrunkBranchName(name) {
  if (typeof name !== 'string') return false;
  return TRUNK_BRANCH_NAMES.includes(name);
}

/**
 * Is `name` something R2 will accept at commit time? Either trunk OR
 * transport. Anything else is rejected with a banned-pattern explanation
 * (when one matches) or a generic "switch to main or create a transport
 * branch" message.
 */
export function isAcceptableBranchName(name) {
  return isTrunkBranchName(name) || isTransportBranchName(name);
}

/**
 * Pull the slice ID out of a transport-branch name. Returns the `<PROJECT>-<DIGITS>`
 * (and optional `-<suffix>`) portion, or null when the name is not a
 * transport branch.
 *
 * Example:
 *   extractSliceFromTransportName('tx-TPL-234')         → 'TPL-234'
 *   extractSliceFromTransportName('tx-TPL-227-interim') → 'TPL-227-interim'
 *   extractSliceFromTransportName('main')               → null
 */
export function extractSliceFromTransportName(name) {
  if (!isTransportBranchName(name)) return null;
  return name.slice('tx-'.length);
}

/**
 * Find the first banned pattern that matches `name`. Returns the entry
 * (so the caller can read `reason`) or null when nothing matches.
 *
 * Used to give the operator a specific error message — generic
 * "not a transport branch" is unhelpful when the actual problem is
 * that they typed `feature/foo`.
 */
export function findBannedBranchReason(name) {
  if (typeof name !== 'string') return null;
  for (const entry of BANNED_BRANCH_PATTERNS) {
    if (entry.match.test(name)) return entry;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Merge marker file
// ---------------------------------------------------------------------------

/**
 * Marker filename. Lives under `.claims/` so it sits alongside the
 * existing claims + audit-log paths (single coordination directory).
 *
 * Hidden (leading dot) so listings don't surface it as ordinary repo
 * content; .claims/.gitkeep exists in this repo so the directory is
 * tracked but transient files inside it are not.
 *
 * One marker at a time — coa-merge writes it on entry to transport-mode
 * and removes it on exit. A second concurrent coa-merge sees the marker
 * and refuses, so the marker is a mutex as well as a permission token.
 */
export const MERGING_MARKER_FILENAME = '.coa-merging.lock';

/**
 * Compose the marker file path under a given repo root. The path is
 * deliberately hard-coded (no env override) so a tampered env variable
 * cannot redirect the marker to a forged location.
 */
export function mergingMarkerPath(repoRoot) {
  if (typeof repoRoot !== 'string' || repoRoot.length === 0) {
    throw new Error('mergingMarkerPath: repoRoot must be a non-empty string');
  }
  // Use forward slashes; both POSIX and Windows tolerate them and the
  // test suite normalizes path comparisons to forward slashes anyway.
  return `${repoRoot}/.claims/${MERGING_MARKER_FILENAME}`;
}

/**
 * Maximum age the merge marker can have before transport-branch-check
 * refuses it. The ceremony shouldn't take longer than this — the
 * caller writes the marker, hits pre-commit within seconds, and removes
 * it on exit. A stale marker means a previous coa-merge crashed; the
 * next run should refuse and require operator cleanup.
 */
export const MERGING_MARKER_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Compose the marker JSON content. Three fields are mandatory:
 *
 *   - pid   : process.pid of the coa-merge run (for parent-PID matching
 *             in the checker — proves the marker was written by the
 *             pre-commit hook's parent process)
 *   - branch: the transport-branch name (so a marker written for one
 *             branch cannot ride a commit on a different branch)
 *   - ts    : Date.now() when the marker was written (for age check)
 *
 * The function returns a string ready for writeFileSync — a stable JSON
 * shape with newline so editors don't complain.
 */
export function mergingMarkerContent({ pid, branch, ts }) {
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new Error('mergingMarkerContent: pid must be a positive finite number');
  }
  if (!isTransportBranchName(branch)) {
    throw new Error(`mergingMarkerContent: branch must be a transport-branch name, got "${branch}"`);
  }
  if (!Number.isFinite(ts) || ts <= 0) {
    throw new Error('mergingMarkerContent: ts must be a positive finite number');
  }
  return JSON.stringify({ pid, branch, ts }, null, 2) + '\n';
}

/**
 * Parse a marker file's contents back into { pid, branch, ts } or
 * return null when the content is malformed, missing fields, or has
 * unexpected types. The checker treats null as "no valid marker" —
 * indistinguishable from an absent marker, which is exactly what we
 * want for forged or corrupted files.
 *
 * Pure function — no I/O. Caller passes the file's text content.
 */
export function parseMergingMarker(content) {
  if (typeof content !== 'string' || content.length === 0) return null;
  let raw;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const { pid, branch, ts } = raw;
  if (!Number.isFinite(pid) || pid <= 0) return null;
  if (typeof branch !== 'string' || !isTransportBranchName(branch)) return null;
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return { pid, branch, ts };
}

// ---------------------------------------------------------------------------
// Age thresholds and verdicts
// ---------------------------------------------------------------------------

/**
 * Warn threshold (in hours): branches older than this emit a stderr
 * warning at commit time but do not block the commit. The 24h figure
 * mirrors the "transport branches are short-lived" expectation in
 * ADR-0002 and parallel-sessions.md.
 */
export const TRANSPORT_BRANCH_AGE_WARN_HOURS = 24;

/**
 * Refuse threshold (in hours): branches older than this are rejected at
 * commit time unless the operator passes an explicit override (see
 * scripts/checks/transport-branch-check.mjs --really). 168 hours = 7
 * days, the latest a transport branch should survive without operator
 * review.
 */
export const TRANSPORT_BRANCH_AGE_REFUSE_HOURS = 168;

/**
 * Hours since `branchCreationTs` (epoch milliseconds). Returns a
 * non-negative number. `nowTs` defaults to Date.now() but tests always
 * pass an explicit value for determinism.
 */
export function hoursSinceBranchCreation(branchCreationTs, nowTs) {
  if (!Number.isFinite(branchCreationTs) || branchCreationTs <= 0) return 0;
  if (!Number.isFinite(nowTs) || nowTs <= 0) return 0;
  const diffMs = Math.max(0, nowTs - branchCreationTs);
  return diffMs / 3_600_000;
}

/**
 * Map an age (in hours) to a verdict tag:
 *   'ok'     — under warn threshold; commit normally
 *   'warn'   — between warn and refuse; emit warning, allow commit
 *   'refuse' — past refuse threshold; reject commit (override required)
 *
 * Default thresholds match the constants above; tests can pass their
 * own to pin boundary cases.
 */
export function ageVerdict(
  hours,
  warnThreshold = TRANSPORT_BRANCH_AGE_WARN_HOURS,
  refuseThreshold = TRANSPORT_BRANCH_AGE_REFUSE_HOURS,
) {
  if (!Number.isFinite(hours) || hours < 0) return 'ok';
  if (hours >= refuseThreshold) return 'refuse';
  if (hours >= warnThreshold) return 'warn';
  return 'ok';
}

// ---------------------------------------------------------------------------
// Ceremony-file detection
// ---------------------------------------------------------------------------

/**
 * The three files coa-merge writes during the version ceremony. A
 * transport-branch commit that stages any of these without a valid
 * marker is rejected — the marker is the only path that legitimately
 * adds these files mid-branch.
 *
 * Frozen so callers cannot accidentally mutate the table; tests pin
 * the membership.
 */
export const CEREMONY_FILES = Object.freeze(['VERSION', 'package.json', 'CHANGELOG.md']);

/**
 * Does the staged-file list intersect the ceremony-files set? Returns
 * the array of intersecting paths (empty when none). The checker uses
 * this intersection to decide whether a marker is required.
 *
 * Path comparison is case-sensitive on the canonical names; on
 * Windows-styled paths the staged listing is already in forward-slash
 * form (git emits forward slashes).
 */
export function ceremonyFilesIn(stagedPaths) {
  if (!Array.isArray(stagedPaths)) return [];
  const set = new Set(CEREMONY_FILES);
  const out = [];
  for (const p of stagedPaths) {
    if (typeof p !== 'string') continue;
    const norm = p.replaceAll('\\', '/');
    if (set.has(norm)) out.push(norm);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Slice ID helpers (used by coa-worktree --create --slice= and the
// transport-branch flow; pinned here so they live next to the canonical
// transport-branch regex.)
// ---------------------------------------------------------------------------

/**
 * Slice IDs match `<PREFIX>-<DIGITS>(-<lower-suffix>)?` where PREFIX may be
 * multi-segment (e.g. AIC-DEV, RELEASE-Q1-FEAT) or single-segment (e.g. TPL, X).
 * Derived from the transport-branch regex with `tx-` removed (TPL-303 / ADR-0033).
 *
 * Capture groups:
 *   [1] prefix (e.g. "AIC-DEV" or "TPL")
 *   [2] digits (e.g. "167")
 *   [3] optional lowercase suffix (e.g. "-interim") — may be undefined
 *
 * First segment allows a single letter ([A-Z][A-Z0-9]*) for backward compat;
 * subsequent segments require at least two chars ([A-Z][A-Z0-9]+) so that
 * `-X` appended to a number is not misread as a new segment.
 */
const SLICE_ID_RE = /^([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]+)*)-(\d+)(-[a-z][a-z0-9]*)?$/;

/**
 * Is the supplied string a syntactically valid slice ID
 * (e.g. `TPL-234`, `AIC-088`, `TPL-227-interim`)?
 *
 * Pure check; does not consult the backlog or git.
 */
export function isValidSliceId(id) {
  if (typeof id !== 'string') return false;
  return SLICE_ID_RE.test(id);
}

/**
 * Compose the canonical transport-branch name for a slice ID:
 *   transportBranchNameForSlice('TPL-234') → 'tx-TPL-234'
 *
 * Throws on invalid input — coa-worktree refuses bad IDs at command
 * parse time and tests pin the throw shape.
 */
export function transportBranchNameForSlice(id) {
  if (!isValidSliceId(id)) {
    throw new Error(
      `transportBranchNameForSlice: not a valid slice ID: ${JSON.stringify(id)}`,
    );
  }
  return `tx-${id}`;
}

// ---------------------------------------------------------------------------
// F12 — repo-shape classification for the transport-mode ff-update step.
//
// R2's original transport-mode flow advanced the trunk ref via
// `git update-ref refs/heads/main HEAD <oldSha>` from inside the
// transport worktree. That works for the ref but does not touch any
// other worktree's working tree, leaving an operator-visible desync
// when main is checked out elsewhere — the F12 incident shape.
//
// The fix routes by repo shape:
//
//   - bare repo                  → keep `update-ref` (no working tree
//                                   to sync)
//   - main not checked out       → keep `update-ref` + emit a stderr
//                                   warning (orphan setup; rare)
//   - main checked out elsewhere → use `git push --force-with-lease`
//                                   targeting the main worktree path
//                                   with `receive.denyCurrentBranch=
//                                   updateInstead` set on that repo;
//                                   git atomically advances the ref
//                                   AND syncs the working tree, and
//                                   refuses on a dirty working tree
//                                   by built-in semantics
//   - main checked out elsewhere → REFUSE with operator-actionable
//     but config not set            command pointing at the one-time
//                                   `receive.denyCurrentBranch=
//                                   updateInstead` setup. Auto-config
//                                   is intentionally NOT the default
//                                   so we don't silently mutate the
//                                   target repo's config.
// ---------------------------------------------------------------------------

/**
 * The four ff-update method tags returned by `classifyFfUpdateMethod`.
 * Frozen so callers cannot accidentally mutate the constant.
 */
export const FF_UPDATE_METHODS = Object.freeze({
  PUSH_UPDATE_INSTEAD: 'push-update-instead',
  UPDATE_REF_BARE: 'update-ref-bare',
  UPDATE_REF_NO_MAIN: 'update-ref-no-main',
  REFUSE_NEEDS_CONFIG: 'refuse-needs-config',
});

/**
 * Parse `git worktree list --porcelain` output into the entries it
 * describes. Each entry is `{ path, branch, head, bare }` where bare
 * is true for the bare-repo metadata entry (no `branch:` line follows
 * but the porcelain emits `bare`).
 *
 * Empty/invalid input → empty array. Tolerates Windows CRLF, blank
 * separators between entries, and extra unknown lines (forward-
 * compatible with newer git versions adding fields).
 */
export function parseWorktreeListPorcelain(output) {
  if (typeof output !== 'string' || output.length === 0) return [];
  const entries = [];
  let current = null;
  const lines = output.replace(/\r\n/g, '\n').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      if (current) { entries.push(current); current = null; }
      continue;
    }
    if (line.startsWith('worktree ')) {
      if (current) entries.push(current);
      current = { path: line.slice('worktree '.length) };
      continue;
    }
    if (!current) continue;
    if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (line.startsWith('branch ')) {
      const ref = line.slice('branch '.length);
      current.branch = ref.startsWith('refs/heads/')
        ? ref.slice('refs/heads/'.length)
        : ref;
    } else if (line === 'bare') {
      current.bare = true;
    }
    // Unknown fields are silently ignored — porcelain is
    // forward-compatible by design.
  }
  if (current) entries.push(current);
  return entries;
}

/**
 * Find the worktree whose checked-out branch matches `trunkName`
 * (defaults to 'main'). Returns the entry `{ path, branch, head }`
 * or null when no worktree is on trunk.
 *
 * Pure: takes the parsed (or raw) `git worktree list --porcelain`
 * output and the trunk name. The bare-repo metadata entry is
 * skipped because bare entries have no `branch` field.
 */
export function findMainWorktree(worktreeListOutput, trunkName = 'main') {
  if (typeof trunkName !== 'string' || trunkName.length === 0) return null;
  const entries = typeof worktreeListOutput === 'string'
    ? parseWorktreeListPorcelain(worktreeListOutput)
    : Array.isArray(worktreeListOutput) ? worktreeListOutput : [];
  for (const entry of entries) {
    if (!entry || entry.bare) continue;
    if (entry.branch === trunkName) return entry;
  }
  return null;
}

/**
 * Is the captured `receive.denyCurrentBranch` git-config value the
 * exact `updateInstead` mode required to make `git push` to the
 * checked-out branch atomically advance the ref AND sync the working
 * tree?
 *
 * Pure: takes the string value (or null/undefined when unset) and
 * returns boolean. `ignore`, `warn`, `refuse`, '' all return false —
 * only the explicit `updateInstead` opt-in qualifies.
 */
export function checkUpdateInsteadConfig(configValue) {
  if (typeof configValue !== 'string') return false;
  return configValue.trim() === 'updateInstead';
}

/**
 * Classify the ff-update method coa-merge should use given the repo
 * shape and config. Returns one of the FF_UPDATE_METHODS values.
 *
 * Inputs:
 *   - isBare: boolean (from `git config core.bare` cross-checked with
 *             `git rev-parse --is-bare-repository` — both must agree
 *             to qualify as bare; tampering one without the other is
 *             treated as non-bare so the working-tree sync still runs)
 *   - mainWorktree: the entry returned by findMainWorktree(), or null
 *   - denyCurrentBranchValue: the captured config value (string or
 *                             null/undefined when unset)
 */
export function classifyFfUpdateMethod({
  isBare = false,
  mainWorktree = null,
  denyCurrentBranchValue = null,
} = {}) {
  if (isBare === true) return FF_UPDATE_METHODS.UPDATE_REF_BARE;
  if (!mainWorktree) return FF_UPDATE_METHODS.UPDATE_REF_NO_MAIN;
  if (!checkUpdateInsteadConfig(denyCurrentBranchValue)) {
    return FF_UPDATE_METHODS.REFUSE_NEEDS_CONFIG;
  }
  return FF_UPDATE_METHODS.PUSH_UPDATE_INSTEAD;
}

/**
 * Compose the operator-actionable error message for the
 * REFUSE_NEEDS_CONFIG verdict. The message contains the exact one-time
 * setup command so an operator hitting this in the wild can paste it
 * straight into a shell and rerun coa-merge.
 */
export function composeUpdateInsteadSetupHint(mainWorktreePath) {
  const path = typeof mainWorktreePath === 'string' && mainWorktreePath.length > 0
    ? mainWorktreePath
    : '<main-worktree-path>';
  return [
    'R2 transport-mode ff-update refuses: main worktree at',
    `  ${path}`,
    'has no `receive.denyCurrentBranch=updateInstead` setting.',
    '',
    'Without it, `git push` to the checked-out trunk would silently',
    'leave the main worktree desync\'d (F12 incident shape).',
    '',
    'One-time setup (run once per repo, then rerun coa-merge):',
    `  git -C ${path} config receive.denyCurrentBranch updateInstead`,
    `  git -C ${path} config receive.denyNonFastForwards true`,
    '',
    'Bare repositories skip this requirement automatically.',
  ].join('\n');
}
