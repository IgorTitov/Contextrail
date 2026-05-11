/* @HEADER
 * @version 0.8.14 | 2026-05-11
 * @purpose Worktree lifecycle management — create, teardown, list, audit, refresh, and safely teardown stale COA session worktrees (R4 / ADR-0016).
 * @sidecar coa-worktree.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * COA Worktree Manager.
 *
 * Creates and manages disposable git worktrees for parallel agent
 * sessions. Each worktree gets: symlinked node_modules, copied .env,
 * COA_AGENT identity.
 *
 * R4 (ADR-0016) adds three lifecycle primitives that close the
 * accumulated-debt class of worktree problems exposed by the Zvenix
 * 2026-04-28 incident:
 *
 *   --audit         — visible verdict per worktree (8-tag taxonomy)
 *   --refresh       — safely discard stamp-only header residue
 *   --teardown-stale — operator-gated removal of clean-merged worktrees
 *   --audit-claims  — classify active .claims/ entries against git history (TPL-335)
 *
 * Usage:
 *   node scripts/coa-worktree.mjs --create                          (auto-pick slice ID — default)
 *   node scripts/coa-worktree.mjs --create --slice=<TPL-XXX>        (explicit slice ID)
 *   node scripts/coa-worktree.mjs --create --auto-pick [--auto-pick-prefix=<PREFIX>]
 *   node scripts/coa-worktree.mjs --create [--allow-claim-bump]     (bypass anomaly guard)
 *   node scripts/coa-worktree.mjs --create --name=<session-name>    (session worktree, no branch)
 *   node scripts/coa-worktree.mjs --teardown --name=<session-name> [--force]
 *   node scripts/coa-worktree.mjs --list
 *   node scripts/coa-worktree.mjs --audit [--json] [--name=<X>]
 *   node scripts/coa-worktree.mjs --audit-claims [--execute]        (classify active claims)
 *   node scripts/coa-worktree.mjs --refresh --name=<X> [--dry-run|--execute] [--json]
 *   node scripts/coa-worktree.mjs --teardown-stale [--dry-run|--execute] [--json]
 *                                  [--preserve=<branch1,branch2>] [--trunk=<name>]
 *   node scripts/coa-worktree.mjs --json   (machine-readable output for any mode)
 */

import { execSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  copyFileSync,
  writeFileSync,
  appendFileSync,
  rmSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, basename, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

import { classifyDiff } from './lib/worktree-refresh.mjs';
import {
  classifyVerdict,
  recommendationFor,
  isEligibleForTeardownStale,
  isEligibleForTeardownStaleIncludingDirty,
  isPathNestedInsideRepo,
  isKnownInfraWorktree,
  VERDICTS,
} from './lib/worktree-audit.mjs';
import { isValidSliceId, transportBranchNameForSlice } from './lib/transport-branch.mjs';
import { readSliceIdConfig, ConfigMissingError } from './lib/slice-id-config.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKTREE_PREFIX = 'coa-session-';
const DEFAULT_BRANCH = 'main';

// Path to the JSONL audit log. Shared with claim-check (TPL-221+) so
// every coordination-relevant event lands in one place. Append-only,
// gitignored, operator-local.
//
// Exported so integration tests can assert on the audit log shape
// after running --teardown-stale --execute against fixture worktrees.
export const AUDIT_LOG_PATH = join(ROOT, '.claims', 'audit.log');

/**
 * Resolve the audit-log path for an arbitrary repoRoot. The
 * AUDIT_LOG_PATH constant points at this repo's project root; tests
 * working in a tmp repo need a per-tmp audit-log path.
 */
export function resolveAuditLogPath(repoRoot) {
  return join(repoRoot, '.claims', 'audit.log');
}

// Marker file where --teardown-stale --dry-run records the candidate
// scope, so a subsequent --execute can verify the operator saw the
// same set before mutating. Hash-keyed by candidate paths so the
// marker survives re-runs across shells but invalidates when the
// candidate set changes (e.g., a worktree was modified meanwhile).
const TEARDOWN_MARKER_DIR = join(ROOT, '.claims');
const TEARDOWN_MARKER_PREFIX = 'teardown-stale-marker-';
const TEARDOWN_MARKER_TTL_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Pure / testable helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Generate a unique session name.
 */
export function generateSessionName(prefix = WORKTREE_PREFIX) {
  const suffix = randomBytes(3).toString('hex');
  return `${prefix}${suffix}`;
}

/**
 * Derive the worktree directory path from session name.
 * Worktrees live as siblings of the repo root: ../coa-session-XXXXXX
 */
export function worktreePath(repoRoot, sessionName) {
  return resolve(repoRoot, '..', sessionName);
}

/**
 * Derive the transport worktree path from a slice ID.
 * Convention: ../.worktrees/<reponame>-tx-<slice>
 * Example: transportWorktreePath('/home/u/contextrail-template', 'TPL-334')
 *          → '/home/u/.worktrees/contextrail-template-tx-TPL-334'
 *
 * The .worktrees/ parent is hidden by default ls (dot-prefix), keeping the
 * repo parent directory uncluttered while staying on the same drive for
 * node_modules junction compatibility (TPL-334 / ADR-0050).
 */
export function transportWorktreePath(repoRoot, sliceId) {
  const branchName = transportBranchNameForSlice(sliceId);
  return resolve(repoRoot, '..', '.worktrees', `${basename(repoRoot)}-${branchName}`);
}

/**
 * Parse --key=value arguments (same convention as other COA scripts).
 */
export function parseWorktreeArgs(argv = process.argv.slice(2)) {
  const map = new Map();
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        map.set(arg.slice(0, eq), arg.slice(eq + 1));
      } else {
        map.set(arg, true);
      }
    }
  }
  return {
    has: (k) => map.has(k),
    get: (k) => {
      const v = map.get(k);
      return v === true ? undefined : v;
    },
  };
}

/**
 * Check if a directory has uncommitted changes (staged or unstaged).
 * Returns { clean: boolean, status: string }.
 */
export function checkUncommitted(worktreeDir) {
  const run = spawnSync('git', ['status', '--porcelain'], {
    cwd: worktreeDir,
    encoding: 'utf8',
    shell: false,
  });
  const output = (run.stdout || '').trim();
  return {
    clean: output === '',
    status: output,
  };
}

/**
 * List all git worktrees and filter COA session worktrees.
 * Returns array of { name, path, branch, isCoaSession }.
 */
export function listWorktrees(repoRoot) {
  const run = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  });
  if (run.status !== 0) return [];

  const entries = [];
  let current = {};

  for (const line of (run.stdout || '').split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) entries.push(current);
      current = { path: line.slice(9).trim() };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice(5).trim();
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).trim();
    } else if (line === 'bare') {
      current.bare = true;
    } else if (line === '') {
      if (current.path) entries.push(current);
      current = {};
    }
  }
  if (current.path) entries.push(current);

  return entries.map((e) => {
    const name = basename(e.path);
    return {
      name,
      path: e.path,
      branch: e.branch || '(detached)',
      isCoaSession: name.startsWith(WORKTREE_PREFIX),
    };
  });
}

// ---------------------------------------------------------------------------
// Audit / refresh / teardown helpers (R4, ADR-0016)
// ---------------------------------------------------------------------------

/**
 * Run a git command in a specific worktree. Returns
 * { ok, stdout, stderr, status }. Never throws — callers inspect
 * `ok` and `status`. The audit/refresh paths must keep going after
 * one git probe fails (e.g., a corrupted worktree's `git status`
 * may hang or error; the audit still reports what it can).
 */
function gitIn(cwd, args, opts = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
    timeout: opts.timeout ?? 30_000,
    ...opts,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

/**
 * Detect the trunk branch name. Tries (in order):
 *   1. `--trunk=<name>` CLI override (passed in by main()).
 *   2. `git symbolic-ref refs/remotes/origin/HEAD` (the canonical answer).
 *   3. Existence of a local `main` branch.
 *   4. Existence of a local `master` branch.
 *   5. Fallback to DEFAULT_BRANCH ('main').
 */
function detectTrunkBranch(repoRoot, override) {
  if (override) return override;

  const symref = gitIn(repoRoot, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (symref.ok) {
    const ref = symref.stdout.trim().replace(/^origin\//, '');
    if (ref) return ref;
  }

  for (const candidate of ['main', 'master']) {
    const probe = gitIn(repoRoot, ['rev-parse', '--verify', '--quiet', `refs/heads/${candidate}`]);
    if (probe.ok) return candidate;
  }
  return DEFAULT_BRANCH;
}

/**
 * Decide whether a worktree path is the primary one. The primary
 * worktree has a `.git` DIRECTORY (or, for `--separate-git-dir`
 * setups, the path resolves to the common .git). Linked worktrees
 * have a `.git` FILE pointing to `<commondir>/worktrees/<name>`.
 */
function isPrimaryWorktree(worktreePath) {
  const gitMarker = join(worktreePath, '.git');
  try {
    const s = statSync(gitMarker);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read merge-state markers from the worktree's .git directory.
 * Linked worktrees have these in `<commondir>/worktrees/<name>/`,
 * so we resolve via `git rev-parse --git-dir` first.
 */
function detectMergeState(worktreePath) {
  const probe = gitIn(worktreePath, ['rev-parse', '--git-dir']);
  if (!probe.ok) return { mergeInProgress: false, rebaseInProgress: false };
  let gitDir = probe.stdout.trim();
  if (!isAbsolute(gitDir)) gitDir = resolve(worktreePath, gitDir);
  const mergeInProgress =
    existsSync(join(gitDir, 'MERGE_HEAD')) || existsSync(join(gitDir, 'CHERRY_PICK_HEAD'));
  // rebase-merge / rebase-apply directories are the authoritative signal;
  // REBASE_HEAD can linger as a stale artifact after an interrupted rebase.
  const rebaseInProgress =
    existsSync(join(gitDir, 'rebase-merge')) || existsSync(join(gitDir, 'rebase-apply'));
  return { mergeInProgress, rebaseInProgress };
}

/**
 * Parse `git status --porcelain` into counts and a list of modified
 * paths. Lines look like `XY path` where XY is a 2-char status code:
 * X = staged column, Y = unstaged column.
 */
function parsePorcelain(text) {
  let dirtyCount = 0;
  let stagedCount = 0;
  let untrackedCount = 0;
  let unmergedCount = 0;
  const modified = [];
  for (const raw of text.split('\n')) {
    if (raw.length === 0) continue;
    if (raw.length < 3) continue;
    const xy = raw.slice(0, 2);
    const path = raw.slice(3);
    dirtyCount += 1;
    if (xy === '??') {
      untrackedCount += 1;
      continue;
    }
    if (/^(DD|AU|UD|UA|DU|AA|UU)$/.test(xy)) {
      unmergedCount += 1;
      continue;
    }
    const x = xy[0];
    const y = xy[1];
    if (x !== ' ' && x !== '?') stagedCount += 1;
    // Tracked modified or added (staged or unstaged) — eligible for diff
    // classification. Unmerged paths are excluded from the modified
    // list because their diff shape is not stamp-vs-logic but
    // conflict-resolution.
    if ('MARC'.includes(x) || 'MARC'.includes(y)) {
      modified.push(path);
    }
  }
  return { dirtyCount, stagedCount, untrackedCount, unmergedCount, modified };
}

/**
 * Compute the diffShape — stamp-only vs logic-changed file counts
 * — by spawning `git diff --no-color HEAD -- <file>` for each
 * modified path and feeding the output into classifyDiff().
 *
 * Returns null when the input list is empty (caller renders this as
 * "no diff shape available"). Limits the sample to the first 5
 * logic-changed paths so the audit record stays small.
 */
function computeDiffShape(worktreePath, modifiedPaths) {
  if (!modifiedPaths || modifiedPaths.length === 0) {
    return { stampOnlyCount: 0, logicChangedCount: 0, sample: [] };
  }
  let stampOnlyCount = 0;
  let logicChangedCount = 0;
  const sample = [];
  for (const path of modifiedPaths) {
    const probe = gitIn(worktreePath, ['diff', '--no-color', 'HEAD', '--', path]);
    if (!probe.ok) {
      // Treat probe failures as logic-changed (conservative).
      logicChangedCount += 1;
      if (sample.length < 5) sample.push(path);
      continue;
    }
    const verdict = classifyDiff(probe.stdout);
    if (verdict === 'stamp-only') {
      stampOnlyCount += 1;
    } else if (verdict === 'has-logic') {
      logicChangedCount += 1;
      if (sample.length < 5) sample.push(path);
    }
    // 'no-diff' contributes to neither bucket — the file's status flag
    // disagrees with its diff (e.g., already-restored race).
  }
  return { stampOnlyCount, logicChangedCount, sample };
}

/**
 * Compute one worktree's full audit record. Returns the rich
 * structure described in ADR-0016 plus the verdict + recommendation.
 */
function buildAuditRecord(repoRoot, entry, opts = {}) {
  const { trunkBranch } = opts;
  const wtPath = entry.path;
  // `git worktree list --porcelain` emits the branch as `refs/heads/<name>`.
  // Strip the prefix so verdict comparisons against trunkBranch (which is
  // detected as the short name) work consistently across forms.
  const rawBranch = entry.branch || '(detached)';
  const branch = rawBranch.startsWith('refs/heads/')
    ? rawBranch.slice('refs/heads/'.length)
    : rawBranch;
  const isPrimary = isPrimaryWorktree(wtPath);
  const isMainBranch = branch === trunkBranch;

  const headProbe = gitIn(wtPath, ['rev-parse', '--short=8', 'HEAD']);
  const head = headProbe.ok ? headProbe.stdout.trim() : entry.head || '';

  // Age — time since the branch's last commit, as a usable proxy for
  // "how long has this worktree been sitting around". The exact
  // creation time would require parsing reflogs; the last-commit date
  // is close enough for the audit's purpose.
  let ageHours = null;
  const ageProbe = gitIn(wtPath, ['log', '-1', '--format=%ct', 'HEAD']);
  if (ageProbe.ok) {
    const ts = Number(ageProbe.stdout.trim());
    if (Number.isFinite(ts) && ts > 0) {
      const ageMs = Date.now() - ts * 1000;
      ageHours = Math.max(0, Math.round((ageMs / 3_600_000) * 10) / 10);
    }
  }

  const mergeState = detectMergeState(wtPath);

  const statusProbe = gitIn(wtPath, ['status', '--porcelain']);
  const status = statusProbe.ok
    ? parsePorcelain(statusProbe.stdout)
    : { dirtyCount: 0, stagedCount: 0, untrackedCount: 0, unmergedCount: 0, modified: [] };

  // Divergence vs trunk. Use trunk-branch (local) as the comparison
  // base so the audit works in isolated tmp repos with no remote.
  let aheadOfTrunk = 0;
  let behindTrunk = 0;
  let isMerged = false;
  const trunkRef = `refs/heads/${trunkBranch}`;
  const trunkExists = gitIn(repoRoot, ['rev-parse', '--verify', '--quiet', trunkRef]);
  if (trunkExists.ok) {
    const ancestorProbe = gitIn(wtPath, ['merge-base', '--is-ancestor', 'HEAD', trunkBranch]);
    isMerged = ancestorProbe.status === 0;
    const revListProbe = gitIn(wtPath, [
      'rev-list',
      '--left-right',
      '--count',
      `HEAD...${trunkBranch}`,
    ]);
    if (revListProbe.ok) {
      const parts = revListProbe.stdout.trim().split(/\s+/);
      aheadOfTrunk = Number(parts[0]) || 0;
      behindTrunk = Number(parts[1]) || 0;
    }
  } else {
    // No trunk to compare against — treat as not merged. The verdict
    // path will surface this as "unknown" or a divergent flavour.
    isMerged = false;
  }

  // Diff shape — only meaningful when there are modified tracked paths.
  // Pure untracked files contribute to dirtyCount but not to the
  // stamp-vs-logic decision (they are by definition "new" content).
  let diffShape = null;
  if (status.modified.length > 0) {
    diffShape = computeDiffShape(wtPath, status.modified);
  } else if (status.dirtyCount > 0) {
    // All-untracked dirty: classify as logic for safety.
    diffShape = { stampOnlyCount: 0, logicChangedCount: status.dirtyCount, sample: [] };
  } else {
    diffShape = { stampOnlyCount: 0, logicChangedCount: 0, sample: [] };
  }

  let verdict = classifyVerdict({
    isMainBranch,
    isMerged,
    mergeInProgress: mergeState.mergeInProgress,
    rebaseInProgress: mergeState.rebaseInProgress,
    dirtyCount: status.dirtyCount,
    stampOnlyCount: diffShape.stampOnlyCount,
    logicChangedCount: diffShape.logicChangedCount,
    isNestedInsideRepo: isPathNestedInsideRepo(wtPath, repoRoot),
    isKnownInfraWorktree: isKnownInfraWorktree(wtPath),
  });

  // Primary trunk worktree is always active — WIP there is normal work in
  // progress, not a sign of abandonment. Override any non-clean verdict.
  if (isPrimary && isMainBranch && !mergeState.mergeInProgress && !mergeState.rebaseInProgress) {
    verdict = VERDICTS.CLEAN_ACTIVE;
  }

  return {
    path: wtPath,
    branch,
    head,
    isPrimary,
    isMerged,
    isMainBranch,
    ageHours,
    status: {
      dirtyCount: status.dirtyCount,
      stagedCount: status.stagedCount,
      untrackedCount: status.untrackedCount,
      unmergedCount: status.unmergedCount,
      mergeInProgress: mergeState.mergeInProgress,
      rebaseInProgress: mergeState.rebaseInProgress,
    },
    diffShape,
    divergence: {
      aheadOfTrunk,
      behindTrunk,
    },
    verdict,
    recommendation: recommendationFor(verdict),
  };
}

/**
 * Run the audit over every worktree in the repo.
 */
function collectAuditRecords(repoRoot, opts = {}) {
  const trunkBranch = detectTrunkBranch(repoRoot, opts.trunk);
  const entries = listWorktrees(repoRoot).filter((e) => !e.bare);
  return entries.map((e) => buildAuditRecord(repoRoot, e, { trunkBranch }));
}

function summarizeAudit(records) {
  const verdictCounts = {};
  for (const tag of Object.values(VERDICTS)) verdictCounts[tag] = 0;
  for (const r of records) verdictCounts[r.verdict] = (verdictCounts[r.verdict] || 0) + 1;
  return { count: records.length, verdictCounts };
}

/**
 * Find the audit record whose path or basename matches `nameOrPath`.
 * Returns null when nothing matches. Used by --refresh and --teardown
 * to resolve operator input to a known worktree.
 */
function findRecordByName(records, nameOrPath) {
  if (!nameOrPath) return null;
  const target = String(nameOrPath).replaceAll('\\', '/');
  for (const r of records) {
    const p = r.path.replaceAll('\\', '/');
    if (p === target) return r;
    if (basename(p) === target) return r;
  }
  return null;
}

/**
 * Check whether `cwd` is inside `worktreePath`. Used by the refusal
 * guards on --refresh and --teardown-stale: refusing to act on the
 * worktree the operator is currently sitting in prevents data races
 * and self-removal.
 */
function isCwdInside(cwd, worktreePath) {
  const a = resolve(cwd).replaceAll('\\', '/');
  const b = resolve(worktreePath).replaceAll('\\', '/');
  return a === b || a.startsWith(b + '/');
}

/**
 * Find any active claim that mentions this worktree's branch in
 * `slice`, `notes`, or `targets`. Returns the first match's path or
 * null. Used by --refresh and --teardown-stale to refuse acting on
 * a worktree someone is coordinating around.
 */
function findClaimReferencingBranch(repoRoot, branch) {
  const claimsDir = join(repoRoot, '.claims');
  if (!existsSync(claimsDir)) return null;
  let entries;
  try {
    entries = readdirSync(claimsDir);
  } catch {
    return null;
  }
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    if (name === 'config.json') continue;
    const file = join(claimsDir, name);
    let claim;
    try {
      claim = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    if (claim.status && claim.status !== 'active') continue;
    const haystack = [
      claim.slice ?? '',
      claim.notes ?? '',
      ...(Array.isArray(claim.targets) ? claim.targets : []),
    ].join(' ');
    if (haystack.includes(branch)) return file;
  }
  return null;
}

/**
 * Append a JSONL event to `<repoRoot>/.claims/audit.log`. Returns
 * true on success. Failure is observable — `--teardown-stale` must
 * abort the per-worktree teardown when the log write fails (the
 * audit trail is mandatory).
 */
function appendAuditLog(repoRoot, eventObj) {
  const path = resolveAuditLogPath(repoRoot);
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(eventObj) + '\n', 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Hash the candidate set of worktree paths. Stable across re-runs
 * given the same set, drift on any path change. Used by the
 * teardown marker file so --execute confirms the operator saw the
 * exact same set during their --dry-run.
 */
function hashCandidateSet(paths, opts = {}) {
  const sorted = [...paths].map((p) => p.replaceAll('\\', '/')).sort();
  // includeDirty changes the destruction shape (force-remove vs plain
  // remove), so the marker MUST differ — a clean dry-run cannot
  // authorize a dirty execute even on the same path set.
  const flag = opts.includeDirty ? '\nINCLUDE_DIRTY=1' : '';
  return createHash('sha256')
    .update(sorted.join('\n') + flag)
    .digest('hex')
    .slice(0, 16);
}

function teardownMarkerPath(repoRoot, hash) {
  return join(repoRoot, '.claims', `${TEARDOWN_MARKER_PREFIX}${hash}.json`);
}

function readTeardownMarker(repoRoot, hash) {
  const file = teardownMarkerPath(repoRoot, hash);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    if (typeof raw.ts !== 'number') return null;
    if (Date.now() - raw.ts > TEARDOWN_MARKER_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeTeardownMarker(repoRoot, hash, candidatePaths) {
  try {
    mkdirSync(join(repoRoot, '.claims'), { recursive: true });
    writeFileSync(
      teardownMarkerPath(repoRoot, hash),
      JSON.stringify({ ts: Date.now(), hash, candidatePaths }, null, 2) + '\n',
      'utf8',
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * After a linked worktree is torn down, check whether the main repo's
 * .git/config has a stale `core.worktree` and unset it if so.
 *
 * Normal `git worktree add` never writes `core.worktree` to the main
 * config — it lives in `.git/worktrees/<name>/config` instead. The
 * value can land in main config via a botched coa-merge Step 9c run,
 * an external `git init --separate-git-dir` operation, or autostash
 * recovery that set GIT_WORK_TREE on the wrong cwd. Once present it
 * makes every subsequent `git status` in the main worktree fail with
 * "fatal: ... not a git repository" (AIC-088 incident, 2026-05-04).
 *
 * Unset logic:
 *   - Skip if core.worktree is not set in main .git/config.
 *   - Unset if the value matches `removedPath` (the worktree we just
 *     removed) — even if the path still briefly exists on disk.
 *   - Unset if the value points to a path that no longer exists.
 *   - Leave alone if the value points to a still-existing path that is
 *     NOT the worktree we removed (another legitimate linked worktree).
 *
 * Exported for unit testing (TPL-269).
 *
 * @param {string} repoRoot   - main repo root (has .git/ directory)
 * @param {string} [removedPath] - absolute path of the worktree just removed
 * @returns {{ unset: boolean, value: string|null, reason: string }}
 */
export function unsetStaleCoreWorktree(repoRoot, removedPath) {
  const probe = gitIn(repoRoot, ['config', '--local', '--get', 'core.worktree']);
  if (!probe.ok || !probe.stdout.trim()) {
    return { unset: false, value: null, reason: 'not-set' };
  }
  const value = probe.stdout.trim();

  const normalise = (p) => resolve(p).replaceAll('\\', '/');
  const matchesRemoved =
    typeof removedPath === 'string' && normalise(value) === normalise(removedPath);
  const isMissing = !existsSync(value);

  if (!matchesRemoved && !isMissing) {
    return { unset: false, value, reason: 'points-to-existing-path' };
  }

  const reason = matchesRemoved ? 'matches-removed-worktree' : 'points-to-missing-path';
  const unsetResult = gitIn(repoRoot, ['config', '--local', '--unset', 'core.worktree']);

  if (unsetResult.ok) {
    console.log(`coa-worktree: unset stale core.worktree (${reason}): was "${value}"`);
    return { unset: true, value, reason };
  }
  console.warn(`coa-worktree: failed to unset core.worktree: ${unsetResult.stderr.trim()}`);
  return { unset: false, value, reason: `unset-failed: ${unsetResult.stderr.trim()}` };
}

// ---------------------------------------------------------------------------
// Auto-pick helpers (TPL-280 / ADR-0029)
// ---------------------------------------------------------------------------

/**
 * If claim-derived max exceeds git-log-derived max by more than this value,
 * auto-pick refuses unless --allow-claim-bump / COA_ALLOW_CLAIM_BUMP=1 is set.
 * A gap this large almost certainly indicates stale fixture claim pollution.
 * (TPL-335 / ADR-0051)
 */
export const AUTO_PICK_ANOMALY_THRESHOLD = 50;

/**
 * Return the slice-ID prefix declared in .coa/slice-id-config.json.
 *
 * Throws ConfigMissingError when the config file is absent so callers
 * can surface a recovery hint instead of silently guessing.
 *
 * Exported for unit tests. See docs/guides/slice-id-config.md.
 *
 * @param {string} repoRoot
 * @returns {string}
 */
export function detectDefaultPrefix(repoRoot) {
  const config = readSliceIdConfig(repoRoot);
  return config.prefix;
}

/**
 * Compute the next free slice ID for the given prefix by scanning:
 *   1. `git log --all` for committed uses of the prefix
 *   2. Active `.claims/*.json` files for the same prefix
 *
 * Returns `${prefix}-${padded}` where padded is at least 3 digits.
 * Example: prefix='TPL', max=290 → 'TPL-291'
 *
 * Throws an Error (or returns {error, anomaly:true}) when the claim-derived
 * max exceeds git-log-derived max by more than AUTO_PICK_ANOMALY_THRESHOLD,
 * unless opts.allowClaimBump is true. (TPL-335 / ADR-0051)
 *
 * Pure of side-effects beyond the two read operations. Exported for
 * unit tests.
 *
 * @param {string} repoRoot   - root of the git repository to scan
 * @param {string} prefix     - uppercase slice prefix, e.g. 'TPL'
 * @param {string} [claimsDir] - path to .claims/ dir (defaults to <repoRoot>/.claims)
 * @param {object} [opts]
 * @param {boolean} [opts.allowClaimBump] - skip anomaly guard (operator override)
 */
export function autoPickNextSliceId(repoRoot, prefix, claimsDir, opts = {}) {
  const padding = opts.padding ?? 3;
  const numberingStart = opts.numberingStart ?? 1;
  const allowClaimBump = opts.allowClaimBump ?? process.env.COA_ALLOW_CLAIM_BUMP === '1';
  const effectiveClaimsDir = claimsDir || join(repoRoot, '.claims');

  // 1. Scan git history
  const histResult = spawnSync('git', ['log', '--all', '--oneline'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const histText = histResult.status === 0 ? histResult.stdout || '' : '';
  const re = new RegExp(`\\b${prefix}-(\\d+)\\b`, 'g');
  let gitLogMaxN = 0;
  for (const m of histText.matchAll(re)) {
    const n = Number(m[1]);
    if (n > gitLogMaxN) gitLogMaxN = n;
  }

  // 2. Scan active claims
  let claimMaxN = 0;
  if (existsSync(effectiveClaimsDir)) {
    let entries;
    try {
      entries = readdirSync(effectiveClaimsDir);
    } catch {
      entries = [];
    }
    for (const name of entries) {
      if (!name.endsWith('.json') || name === 'config.json') continue;
      try {
        const claim = JSON.parse(readFileSync(join(effectiveClaimsDir, name), 'utf8'));
        if (claim.status !== 'active') continue;
        const sliceStr = claim.slice || '';
        const cm = sliceStr.match(new RegExp(`^${prefix}-(\\d+)`));
        if (cm) {
          const n = Number(cm[1]);
          if (n > claimMaxN) claimMaxN = n;
        }
      } catch {
        /* skip malformed files */
      }
    }
  }

  // 3. Anomaly guard (TPL-335 / ADR-0051)
  if (!allowClaimBump && claimMaxN > gitLogMaxN + AUTO_PICK_ANOMALY_THRESHOLD) {
    const claimId = `${prefix}-${claimMaxN}`;
    const gitId = gitLogMaxN > 0 ? `${prefix}-${gitLogMaxN}` : '(none)';
    const err = new Error(
      `auto-pick refused: claim-derived max (${claimId}) is suspiciously\n` +
        `larger than git-log-derived max (${gitId}). Likely stale fixture\n` +
        `claim pollution in .claims/.\n\n` +
        `Run \`node scripts/coa-worktree.mjs --audit-claims\` to investigate.\n` +
        `To override and use the claim-derived value, pass --allow-claim-bump.`,
    );
    err.anomaly = true;
    err.claimMaxId = claimId;
    err.gitLogMaxId = gitId;
    throw err;
  }

  const maxN = Math.max(gitLogMaxN, claimMaxN);
  const next = Math.max(maxN + 1, numberingStart);
  return `${prefix}-${String(next).padStart(padding, '0')}`;
}

// ---------------------------------------------------------------------------
// Side-effectful operations (CLI only)
// ---------------------------------------------------------------------------

/**
 * Create a new worktree — either a session worktree (--name=) or a
 * transport worktree (--slice=). Returns { exitCode, result } without
 * calling process.exit so callers and tests can inspect the outcome.
 *
 * Session mode (opts.sessionName):  ../coa-session-XXXXXX  on main
 * Transport mode (opts.sliceId):    ../.worktrees/<repo>-tx-<slice>   on new tx-<slice> branch
 *
 * node_modules is linked (junction on Windows, symlink on POSIX) when
 * the main repo's node_modules exists — prevents "Cannot find module"
 * errors without a full pnpm install in every new worktree.
 *
 * Transport mode runs `claim-check --acquire --slice=<sliceId>` before
 * creating the worktree (C4 / TPL-282). A non-zero exit means collision
 * detected — the error is surfaced verbatim and no worktree is created.
 *
 * Auto-pick mode (--auto-pick, or default when neither --slice nor --name
 * is given): scans git history + active claims to find the next free ID,
 * then atomically acquires the claim. Bounded retry on collision (ADR-0029).
 */
export function runCreate(repoRoot, opts = {}) {
  const {
    wantJson = false,
    sessionName,
    sliceId,
    silent = false,
    trunk,
    // skipSliceCheck: internal test seam — bypasses C4 claim-check --acquire.
    // ONLY for unit tests that pre-date C4 and use retired slice IDs.
    // Production callers must never set this.
    skipSliceCheck = false,
    // autoPick: explicit --auto-pick flag. Default behaviour (no --slice, no --name)
    // also triggers auto-pick — see ADR-0029.
    autoPick = false,
    // autoPickPrefix: override the detected prefix, e.g. 'AIC'.
    autoPickPrefix = null,
    // agent: caller agent role recorded in .coa-session.agent. Required in
    // transport mode (sliceId / auto-pick) so coa-merge step 0.5 ownership
    // check matches without operator override (TPL-310 / ADR-0038).
    agent = null,
    // enforceAgent: when true, transport mode refuses without caller agent
    // identity. CLI sets this to true; tests default to false for backward
    // compatibility with pre-TPL-310 fixtures (38 call sites).
    enforceAgent = false,
    // allowClaimBump: bypass the anomaly guard when claim-derived max is
    // suspiciously larger than git-log-derived max (TPL-335 / ADR-0051).
    // Operator-gated; also reads COA_ALLOW_CLAIM_BUMP=1 env.
    allowClaimBump = false,
  } = opts;
  const trunkBranch = detectTrunkBranch(repoRoot, trunk);

  const fail = (msg) => {
    const r = { ok: false, error: msg };
    if (!silent) {
      if (wantJson) console.log(JSON.stringify(r));
      else console.error(`coa-worktree --create: ${msg}`);
    }
    return { exitCode: 1, result: r };
  };

  // Conflict: --slice= and --auto-pick are mutually exclusive.
  if (sliceId && autoPick) {
    return fail('--slice and --auto-pick are mutually exclusive; use only one');
  }

  // TPL-310: caller agent identity for .coa-session.agent. Transport mode
  // (sliceId or auto-pick) requires identity so coa-merge step 0.5 ownership
  // check passes without COA_OPERATOR override on every routine ceremony.
  const callerAgent = agent || process.env.COA_AGENT || null;
  const isTransport = !!sliceId || autoPick || (!sliceId && !sessionName);
  if (enforceAgent && isTransport && !callerAgent) {
    return fail(
      `--create requires --agent=<role> or COA_AGENT env in transport mode.\n\n` +
        `Why: .coa-session.agent must record caller identity so coa-merge step 0.5\n` +
        `ownership check matches without COA_OPERATOR override (ADR-0038).\n\n` +
        `Examples:\n` +
        `  node scripts/coa-worktree.mjs --create --agent=feature-implementer\n` +
        `  COA_AGENT=frontend-specialist node scripts/coa-worktree.mjs --create --slice=TPL-NNN\n`,
    );
  }

  // Resolve effective slice ID. Auto-pick fires when --auto-pick is explicitly
  // passed OR when neither --slice= nor --name= is given (ADR-0029 default).
  let effectiveSliceId = sliceId || null;
  let claimAlreadyAcquired = false;
  const doAutoPick = autoPick || (!sliceId && !sessionName);

  if (doAutoPick) {
    const claimsDir = join(repoRoot, '.claims');

    // Resolve prefix and formatting params.
    // When --auto-pick-prefix is given it overrides config (backward compat, operator escape hatch).
    let prefix;
    let padding = 3;
    let numberingStart = 1;
    if (autoPickPrefix) {
      prefix = autoPickPrefix;
    } else {
      let config;
      try {
        config = readSliceIdConfig(repoRoot);
      } catch (err) {
        if (err instanceof ConfigMissingError) {
          return fail(err.message);
        }
        throw err;
      }
      prefix = config.prefix;
      padding = config.padding ?? 3;
      numberingStart = config.numbering_start ?? 1;
    }

    let baseN = null;
    let pickedId = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      let candidate;
      if (attempt === 0) {
        try {
          candidate = autoPickNextSliceId(repoRoot, prefix, claimsDir, {
            padding,
            numberingStart,
            allowClaimBump,
          });
        } catch (err) {
          if (err.anomaly) return fail(err.message);
          throw err;
        }
        const m = candidate.match(/-(\d+)$/);
        baseN = m ? Number(m[1]) : numberingStart;
      } else {
        baseN += 1;
        candidate = `${prefix}-${String(baseN).padStart(padding, '0')}`;
      }

      if (!isValidSliceId(candidate)) {
        return fail(`auto-pick: generated invalid slice ID "${candidate}" for prefix "${prefix}"`);
      }

      if (skipSliceCheck) {
        // Test/bypass mode — no claim-check, accept the candidate immediately.
        pickedId = candidate;
        break;
      }

      // Production path: atomically acquire claim for the candidate.
      const claimResult = spawnSync(
        process.execPath,
        [
          join(__dirname, 'checks/claim-check.mjs'),
          '--acquire',
          `--agent=coa-worktree`,
          `--slice=${candidate}`,
          `--targets=${transportBranchNameForSlice(candidate)}`,
          '--action=extend',
        ],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          stdio: 'pipe',
          env: { ...process.env, COA_HISTORY_ROOT: ROOT },
        },
      );

      if (claimResult.status === 0) {
        pickedId = candidate;
        claimAlreadyAcquired = true;
        break;
      }

      const pickErrMsg = (claimResult.stderr || claimResult.stdout || '').trim();
      if (!pickErrMsg.includes('slice-id-collision')) {
        return fail(`auto-pick claim-check failed: ${pickErrMsg}`);
      }
      // Collision on this candidate — try next number
    }

    if (!pickedId) {
      return fail('auto-pick failed: could not acquire a free slice ID after 5 attempts');
    }

    if (!silent && !wantJson) {
      console.log(`[coa-worktree] auto-picked: ${pickedId}`);
    }
    effectiveSliceId = pickedId;
  }

  const autoPickedId = doAutoPick ? effectiveSliceId : null;
  let wtPath;
  let branchName;
  let gitArgs;

  if (effectiveSliceId) {
    if (!isValidSliceId(effectiveSliceId)) {
      return fail(
        `invalid slice ID: ${JSON.stringify(effectiveSliceId)} — expected shape TPL-251, AIC-088, etc.`,
      );
    }
    branchName = transportBranchNameForSlice(effectiveSliceId);
    wtPath = transportWorktreePath(repoRoot, effectiveSliceId);
    // Guard: refuse if the branch already exists. git worktree add -b
    // silently reuses an existing branch in some edge cases, which can
    // land a new worktree on stale orphan commits (AIC-118 incident).
    const branchExists = spawnSync(
      'git',
      ['rev-parse', '--verify', '--quiet', `refs/heads/${branchName}`],
      { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' },
    );
    if (branchExists.status === 0) {
      // Find the registered worktree path for this branch, if any.
      const worktrees = listWorktrees(repoRoot);
      const existingWt = worktrees.find(
        (w) => w.branch === `refs/heads/${branchName}` || w.branch === branchName,
      );
      const wtPathLine = existingWt
        ? `Existing worktree path: ${existingWt.path}`
        : `Branch exists but is not registered as a worktree — likely orphaned.`;
      const wtRemoveCmd = existingWt
        ? `       git worktree remove --force ${existingWt.path}\n       git branch -D ${branchName}`
        : `       git branch -D ${branchName}`;
      const sessionFileCmd = existingWt
        ? `       cat ${existingWt.path}/.coa-session 2>/dev/null`
        : `       (no worktree path registered)`;
      return fail(
        `branch '${branchName}' already exists.\n\n` +
          `STOP. Do NOT cd into the existing worktree or reuse it.\n` +
          `The worktree may belong to:\n` +
          `  - Another active session (slice in progress)\n` +
          `  - An aborted ceremony with uncommitted work\n` +
          `  - A namespace collision with another session's slice ID\n\n` +
          `${wtPathLine}\n\n` +
          `Recovery options (escalate to operator if unclear):\n` +
          `  1. Pick a different slice ID. Try auto-pick (omit --slice):\n` +
          `       node scripts/coa-worktree.mjs --create\n` +
          `  2. Investigate ownership of existing worktree:\n` +
          `${sessionFileCmd}\n` +
          `  3. If confirmed safe to delete (OPERATOR-AUTHORIZED only):\n` +
          `${wtRemoveCmd}\n\n` +
          `DO NOT proceed by reusing the existing worktree without explicit operator approval.`,
      );
    }

    // C4 (TPL-282): slice-ID uniqueness check via claim-check --acquire.
    // Skip when auto-pick already acquired the claim (claimAlreadyAcquired) or
    // in skipSliceCheck (test) mode. Never runs twice for the same slice.
    if (!skipSliceCheck && !claimAlreadyAcquired) {
      const claimCheckArgs = [
        join(__dirname, 'checks/claim-check.mjs'),
        '--acquire',
        `--agent=coa-worktree`,
        `--slice=${effectiveSliceId}`,
        `--targets=${branchName}`,
        '--action=extend',
      ];
      const claimResult = spawnSync(process.execPath, claimCheckArgs, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, COA_HISTORY_ROOT: ROOT },
      });
      if (claimResult.status !== 0) {
        const errMsg = (claimResult.stderr || claimResult.stdout || '').trim();
        if (!silent && !wantJson) {
          console.error(`coa-worktree --create: claim-check failed:\n${errMsg}`);
        }
        return { exitCode: 1, result: { ok: false, error: errMsg } };
      }
    }

    gitArgs = ['worktree', 'add', '-b', branchName, wtPath, trunkBranch];
  } else {
    const name = sessionName || generateSessionName();
    branchName = trunkBranch;
    wtPath = worktreePath(repoRoot, name);
    gitArgs = ['worktree', 'add', wtPath, trunkBranch];
  }

  if (existsSync(wtPath)) {
    return fail(
      `worktree directory already exists: ${wtPath}\n\n` +
        `STOP. Do NOT proceed into this directory.\n` +
        `Recovery options (escalate to operator if unclear):\n` +
        `  1. Pick a different slice ID. Try auto-pick (omit --slice):\n` +
        `       node scripts/coa-worktree.mjs --create\n` +
        `  2. If the directory is truly orphaned (OPERATOR-AUTHORIZED only):\n` +
        `       git worktree remove --force ${wtPath}\n` +
        `       rm -rf ${wtPath}`,
    );
  }

  // Ensure the .worktrees/ parent directory exists for transport worktrees.
  // mkdirSync with recursive:true is a no-op when the dir already exists,
  // so concurrent creates are safe. Session worktrees (worktreePath) land
  // as siblings of repoRoot and need no parent creation.
  if (effectiveSliceId) {
    const worktreesDir = resolve(wtPath, '..');
    mkdirSync(worktreesDir, { recursive: true });
  }

  const gitResult = spawnSync('git', gitArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (gitResult.status !== 0) {
    return fail(`git worktree add failed: ${(gitResult.stderr || '').trim()}`);
  }

  // Link node_modules — junction on Windows (no admin needed), symlink on POSIX.
  const srcModules = join(repoRoot, 'node_modules');
  const dstModules = join(wtPath, 'node_modules');
  let nodeModulesLinked = false;
  if (existsSync(srcModules) && !existsSync(dstModules)) {
    try {
      const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
      symlinkSync(srcModules, dstModules, symlinkType);
      nodeModulesLinked = true;
    } catch (err) {
      if (!silent && !wantJson) {
        console.warn(
          `coa-worktree: node_modules link failed (${err.message}), run pnpm install in worktree`,
        );
      }
    }
  }

  // Copy .env if present — not symlinked to avoid accidental overwrites.
  const srcEnv = join(repoRoot, '.env');
  const dstEnv = join(wtPath, '.env');
  if (existsSync(srcEnv) && !existsSync(dstEnv)) {
    try {
      copyFileSync(srcEnv, dstEnv);
    } catch {
      /* non-fatal */
    }
  }

  // Copy .claude/settings*.json so operator permissions apply in the transport
  // worktree (settings.local.json is gitignored, so git worktree add won't copy
  // it). Pattern mirrors TPL-251 node_modules junction. Idempotent: skips files
  // where destination content is identical. Non-fatal on error. (TPL-267)
  const mainClaudeDir = join(repoRoot, '.claude');
  const transportClaudeDir = join(wtPath, '.claude');
  if (existsSync(mainClaudeDir)) {
    try {
      mkdirSync(transportClaudeDir, { recursive: true });
      const settingsFiles = readdirSync(mainClaudeDir).filter((f) => /^settings.*\.json$/i.test(f));
      for (const f of settingsFiles) {
        const src = join(mainClaudeDir, f);
        const dst = join(transportClaudeDir, f);
        try {
          if (existsSync(dst) && readFileSync(src, 'utf8') === readFileSync(dst, 'utf8')) continue;
          copyFileSync(src, dst);
        } catch {
          /* non-fatal — worktree is usable without local settings */
        }
      }
    } catch (err) {
      if (!silent && !wantJson) {
        console.warn(`coa-worktree --create: failed to copy .claude/settings: ${err.message}`);
      }
    }
  }

  const effectiveName = effectiveSliceId ? branchName : sessionName || basename(wtPath);
  const sessionMeta = {
    sessionName: effectiveName,
    created: new Date().toISOString(),
    repoRoot,
    agent: callerAgent || effectiveName,
    ...(effectiveSliceId ? { sliceId: effectiveSliceId, transportBranch: branchName } : {}),
  };
  writeFileSync(join(wtPath, '.coa-session'), JSON.stringify(sessionMeta, null, 2) + '\n');

  const ok = {
    ok: true,
    sessionName: effectiveName,
    path: wtPath,
    branch: branchName,
    agent: sessionMeta.agent,
    nodeModulesLinked,
    ...(autoPickedId ? { autoPicked: autoPickedId } : {}),
  };

  if (!silent) {
    if (wantJson) {
      console.log(JSON.stringify(ok));
    } else {
      console.log(`coa-worktree --create: ${effectiveName}`);
      console.log(`  path: ${wtPath}`);
      console.log(`  branch: ${branchName}`);
      console.log(`  node_modules: ${nodeModulesLinked ? 'linked' : 'not found in main repo'}`);
      console.log(`  COA_AGENT: ${sessionMeta.agent}`);
      console.log('');
      console.log(`  cd ${wtPath}`);
      console.log(`  export COA_AGENT=${effectiveName}`);
    }
  }

  return { exitCode: 0, result: ok };
}

function createWorktree(repoRoot, sessionName, wantJson, sliceId) {
  const { exitCode } = runCreate(repoRoot, { wantJson, sessionName, sliceId });
  if (exitCode !== 0) process.exit(exitCode);
}

/**
 * Resolve a worktree path from a name, basename, or branch name.
 * Exported so tests can verify the resolution logic directly.
 *
 * Matches (in priority order):
 *   1. Exact full path match
 *   2. basename(path) match (e.g. "coa-session-abc123" or "repo-tx-TPL-263")
 *   3. Branch name match (e.g. "tx-TPL-263" → branch refs/heads/tx-TPL-263)
 *
 * Using git worktree list --porcelain as the source avoids the old
 * path-concatenation approach that prepended the wrong parent dir
 * for transport worktrees named <repo>-tx-<slice>.
 */
export function resolveWorktreePath(repoRoot, nameOrPath) {
  const entries = listWorktrees(repoRoot);
  const norm = String(nameOrPath).replaceAll('\\', '/');
  for (const e of entries) {
    const ePath = e.path.replaceAll('\\', '/');
    const rawBranch = e.branch || '';
    const branch = rawBranch.startsWith('refs/heads/') ? rawBranch.slice(11) : rawBranch;
    if (ePath === norm || basename(ePath) === norm || branch === norm) return e.path;
  }
  return null;
}

/**
 * Exported teardown function — usable in tests and by main().
 * Returns { exitCode, result } like other run* helpers.
 * TPL-285: after worktree removal, strict -d deletes the local branch ref.
 * Unmerged branches are preserved with a warning (never -D).
 */
export function runTeardown(repoRoot, opts = {}) {
  const { sessionName, force = false, wantJson = false, silent = false } = opts;

  const fail = (msg, extras = {}) => {
    const r = { ok: false, error: msg, ...extras };
    if (!silent) {
      if (wantJson) console.log(JSON.stringify(r));
      else console.error(`coa-worktree --teardown: ${msg}`);
    }
    return { exitCode: 1, result: r };
  };

  if (!sessionName) {
    return fail('--name=<session-name> required for teardown');
  }

  // Resolve worktree path and learn the branch name before we destroy anything.
  const wtPath = resolveWorktreePath(repoRoot, sessionName);
  if (!wtPath) {
    return fail(`Worktree not found: ${sessionName}`);
  }

  // Capture branch name from git worktree list while the worktree still exists.
  const all = listWorktrees(repoRoot);
  const record = all.find((w) => w.path.replaceAll('\\', '/') === wtPath.replaceAll('\\', '/'));
  const rawBranch = record ? record.branch || '' : '';
  // Strip refs/heads/ prefix — git worktree list --porcelain emits full ref names.
  const branchName = rawBranch.startsWith('refs/heads/') ? rawBranch.slice(11) : rawBranch || null;

  // Check for uncommitted changes
  if (!force) {
    const { clean, status } = checkUncommitted(wtPath);
    if (!clean) {
      return fail(`Worktree has uncommitted changes. Use --force to override.\n${status}`, {
        uncommitted: status,
      });
    }
  }

  // Remove node_modules symlink first (prevents git worktree remove from traversing it)
  const dstModules = join(wtPath, 'node_modules');
  if (existsSync(dstModules)) {
    try {
      rmSync(dstModules, { recursive: false });
    } catch {
      try {
        rmSync(dstModules, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }
  }

  // Remove .coa-session file
  const sessionFile = join(wtPath, '.coa-session');
  if (existsSync(sessionFile)) {
    try {
      rmSync(sessionFile);
    } catch {
      /* best effort */
    }
  }

  // git worktree remove
  const removeResult = spawnSync('git', ['worktree', 'remove', wtPath, '--force'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (removeResult.status !== 0) {
    return fail(`git worktree remove failed: ${(removeResult.stderr || '').trim()}`);
  }

  // Defensive cleanup: unset stale core.worktree from main .git/config if
  // it points to the path we just removed (or any nonexistent path).
  // This closes the AIC-088 config-corruption pattern (TPL-269).
  unsetStaleCoreWorktree(repoRoot, wtPath);

  // TPL-285: delete the local branch ref strictly (-d, never -D).
  // Mirrors step 9e trust model: zero-information-loss, unmerged branches preserved.
  let branchDeleted = null; // null = no branch ref found / not applicable
  let branchPreserved = null; // branch name when -d refused (unmerged work)
  if (branchName && branchName !== 'HEAD' && branchName !== '(detached)') {
    // Confirm ref exists (worktree teardown does not auto-delete the branch ref).
    const refCheck = spawnSync('git', ['for-each-ref', `refs/heads/${branchName}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    if (refCheck.stdout.trim()) {
      const del = spawnSync('git', ['branch', '-d', branchName], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      if (del.status === 0) {
        branchDeleted = branchName;
        if (!silent) console.log(`[teardown] branch ${branchName} deleted`);
      } else {
        // Unmerged work — preserve, warn, do not fail teardown.
        branchPreserved = branchName;
        if (!silent) {
          console.log(
            `[teardown] branch ${branchName} preserved (unmerged work; use git branch -D manually if intentional)`,
          );
        }
      }
    }
  }

  const resultPayload = { ok: true, sessionName, removed: wtPath, branchDeleted, branchPreserved };
  if (!silent) {
    if (wantJson) console.log(JSON.stringify(resultPayload));
    else console.log(`coa-worktree --teardown: removed ${sessionName}`);
  }
  return { exitCode: 0, result: resultPayload };
}

function listCoaWorktrees(repoRoot, wantJson) {
  const all = listWorktrees(repoRoot);
  const coaSessions = all.filter((w) => w.isCoaSession);

  if (wantJson) {
    console.log(JSON.stringify({ ok: true, sessions: coaSessions, total: coaSessions.length }));
  } else {
    if (coaSessions.length === 0) {
      console.log('coa-worktree --list: no active COA sessions');
    } else {
      console.log(`coa-worktree --list: ${coaSessions.length} active session(s)`);
      for (const s of coaSessions) {
        console.log(`  ${s.name}  ${s.path}  [${s.branch}]`);
      }
    }
  }
}

export function runAudit(repoRoot, opts = {}) {
  const wantJson = !!opts.json;
  const silent = !!opts.silent;
  const records = collectAuditRecords(repoRoot, { trunk: opts.trunk });
  const filtered = opts.name
    ? records.filter((r) => basename(r.path) === opts.name || r.path === opts.name)
    : records;
  const summary = summarizeAudit(filtered);
  const result = { ok: true, worktrees: filtered, summary };

  if (silent) return { exitCode: 0, result };

  if (wantJson) {
    console.log(JSON.stringify(result, null, 2));
    return { exitCode: 0, result };
  }

  if (filtered.length === 0) {
    console.log('coa-worktree --audit: no worktrees match');
    return { exitCode: 0, result };
  }

  const header = ['PATH', 'BRANCH', 'VERDICT', 'ACTION'];
  const rows = filtered.map((r) => {
    // Suppress the dirty-count hint for clean-active: the primary worktree
    // can legitimately have WIP and showing "(N files)" beside "clean-active"
    // is contradictory and confusing to operators.
    const showHint = r.status.dirtyCount > 0 && !r.verdict.startsWith('clean-active');
    const dirtyHint = showHint ? ` (${r.status.dirtyCount} files)` : '';
    const verdictCell = `${r.verdict}${dirtyHint}`;
    return [r.path, r.branch, verdictCell, r.recommendation];
  });
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => String(row[i]).length)),
  );
  const fmt = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');

  console.log(fmt(header));
  console.log(fmt(widths.map((w) => '-'.repeat(w))));
  for (const row of rows) console.log(fmt(row));

  console.log('');
  console.log(`Summary: ${summary.count} worktree(s)`);
  for (const [tag, count] of Object.entries(summary.verdictCounts)) {
    if (count > 0) console.log(`  ${tag}: ${count}`);
  }
  return { exitCode: 0, result };
}

/**
 * Run --refresh on a single named worktree.
 *
 * Default mode is --dry-run. The operator must explicitly pass
 * --execute to actually `git restore` stamp-only paths.
 */
export function runRefresh(repoRoot, opts = {}) {
  const wantJson = !!opts.json;
  const silent = !!opts.silent;
  const trunk = opts.trunk;
  const dryRun = !opts.execute; // default to dry-run when neither flag is set

  const fail = (msg, extras = {}) => {
    const result = { ok: false, error: msg, ...extras };
    if (!silent) {
      if (wantJson) console.log(JSON.stringify(result));
      else console.error(`coa-worktree --refresh: ${msg}`);
    }
    return { exitCode: 1, result };
  };

  if (!opts.name) return fail('--name=<X> is required');

  const records = collectAuditRecords(repoRoot, { trunk });
  const record = findRecordByName(records, opts.name);
  if (!record) return fail(`worktree not found: ${opts.name}`);
  if (record.isPrimary) return fail('refusing to refresh the primary worktree');
  if (record.status.mergeInProgress) return fail('merge in progress — complete or abort first');
  if (record.status.rebaseInProgress) return fail('rebase in progress — complete or abort first');
  if (record.status.stagedCount > 0) {
    return fail('staged changes present — operator must commit or unstage first');
  }
  if (isCwdInside(process.cwd(), record.path)) {
    return fail('refusing to refresh the worktree your shell is currently inside');
  }
  const claimFile = findClaimReferencingBranch(repoRoot, record.branch);
  if (claimFile) {
    return fail(`an active claim references this branch: ${relative(repoRoot, claimFile)}`);
  }

  // Re-collect modified paths and classify each (the audit's diffShape
  // already counted but did not retain per-file verdicts; we want
  // explicit lists for the report).
  const statusProbe = gitIn(record.path, ['status', '--porcelain']);
  const status = statusProbe.ok ? parsePorcelain(statusProbe.stdout) : { modified: [] };

  const stampOnly = [];
  const hasLogic = [];
  const noDiff = [];
  for (const path of status.modified) {
    const probe = gitIn(record.path, ['diff', '--no-color', 'HEAD', '--', path]);
    if (!probe.ok) {
      hasLogic.push(path);
      continue;
    }
    const verdict = classifyDiff(probe.stdout);
    if (verdict === 'stamp-only') stampOnly.push(path);
    else if (verdict === 'has-logic') hasLogic.push(path);
    else noDiff.push(path);
  }

  const result = {
    ok: true,
    mode: dryRun ? 'dry-run' : 'execute',
    worktree: record.path,
    branch: record.branch,
    classified: {
      stampOnly: stampOnly.length,
      hasLogic: hasLogic.length,
      noDiff: noDiff.length,
    },
    preserved: hasLogic.slice(0, 20),
    restored: [],
  };

  if (dryRun) {
    if (!silent) {
      if (wantJson) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`coa-worktree --refresh (dry-run): ${record.path}`);
        console.log(`  stamp-only:    ${stampOnly.length}`);
        console.log(`  has-logic:     ${hasLogic.length}  (will be preserved)`);
        console.log(`  no-diff:       ${noDiff.length}`);
        if (hasLogic.length > 0) {
          console.log('  preserved sample:');
          for (const p of hasLogic.slice(0, 10)) console.log(`    ${p}`);
          if (hasLogic.length > 10) console.log(`    ... and ${hasLogic.length - 10} more`);
        }
        console.log('');
        console.log(`  re-run with --execute to restore ${stampOnly.length} stamp-only file(s)`);
      }
    }
    return { exitCode: 0, result };
  }

  // --execute: restore each stamp-only path. Restore is idempotent
  // (a no-op if the file already matches HEAD), so a partial failure
  // mid-loop simply leaves earlier files restored — a re-run finishes
  // the job.
  for (const path of stampOnly) {
    const probe = gitIn(record.path, ['restore', '--worktree', '--source=HEAD', '--', path]);
    if (probe.ok) {
      result.restored.push(path);
    } else {
      result.preserved.push(path);
    }
  }

  if (!silent) {
    if (wantJson) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`coa-worktree --refresh (execute): ${record.path}`);
      console.log(`  restored:  ${result.restored.length}`);
      console.log(`  preserved: ${hasLogic.length}`);
      if (hasLogic.length > 0) {
        console.log('  preserved sample:');
        for (const p of hasLogic.slice(0, 10)) console.log(`    ${p}`);
      }
    }
  }
  return { exitCode: 0, result };
}

/**
 * Run --teardown-stale across all eligible worktrees.
 *
 * Eligibility (default): verdict === 'clean-merged', branch is not
 * the trunk, branch is not in the --preserve list, no claim references
 * the branch, the operator is not running from inside the candidate,
 * and (for --execute) COA_OPERATOR=1 is set AND a matching --dry-run
 * marker exists.
 *
 * With opts.includeDirty=true (TPL-312 / ADR-0040), eligibility widens
 * to also accept stale-merged-with-wip and stale-merged-with-stamp-residue
 * — operator-gated bulk-cleanup escape hatch. Ancestor (merged-only)
 * safety still holds; unmerged divergent verdicts remain ineligible.
 * Dirty candidates use `git worktree remove --force` and `git branch -D`,
 * and emit a `worktree-teardown-dirty` audit event distinct from the
 * clean `worktree-teardown` event. The marker hash incorporates the
 * includeDirty flag so a clean dry-run cannot authorize a dirty execute.
 */
export function runTeardownStale(repoRoot, opts = {}) {
  const wantJson = !!opts.json;
  const silent = !!opts.silent;
  const dryRun = !opts.execute;
  const trunk = opts.trunk;
  const includeDirty = !!opts.includeDirty;
  const eligibilityFn = includeDirty
    ? isEligibleForTeardownStaleIncludingDirty
    : isEligibleForTeardownStale;
  const preserve = new Set(
    String(opts.preserve || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const fail = (msg, extras = {}) => {
    const result = { ok: false, error: msg, ...extras };
    if (!silent) {
      if (wantJson) console.log(JSON.stringify(result));
      else console.error(`coa-worktree --teardown-stale: ${msg}`);
    }
    return { exitCode: 1, result };
  };

  const trunkBranch = detectTrunkBranch(repoRoot, trunk);
  const records = collectAuditRecords(repoRoot, { trunk: trunkBranch });

  const candidates = [];
  const ineligible = [];
  for (const r of records) {
    if (r.isPrimary) continue;
    if (r.branch === trunkBranch) continue;
    if (preserve.has(r.branch)) {
      ineligible.push({ path: r.path, branch: r.branch, reason: 'preserved' });
      continue;
    }
    if (!eligibilityFn(r.verdict)) {
      ineligible.push({ path: r.path, branch: r.branch, reason: r.verdict });
      continue;
    }
    if (isCwdInside(process.cwd(), r.path)) {
      ineligible.push({ path: r.path, branch: r.branch, reason: 'cwd-inside' });
      continue;
    }
    const claimFile = findClaimReferencingBranch(repoRoot, r.branch);
    if (claimFile) {
      ineligible.push({
        path: r.path,
        branch: r.branch,
        reason: 'claim-active',
        claim: relative(repoRoot, claimFile),
      });
      continue;
    }
    candidates.push(r);
  }

  const candidatePaths = candidates.map((r) => r.path);
  const hash = hashCandidateSet(candidatePaths, { includeDirty });
  const isDirtyVerdict = (v) => v !== VERDICTS.CLEAN_MERGED;
  const cleanCandidates = candidates.filter((r) => !isDirtyVerdict(r.verdict));
  const dirtyCandidates = candidates.filter((r) => isDirtyVerdict(r.verdict));

  if (dryRun) {
    writeTeardownMarker(repoRoot, hash, candidatePaths);
    const result = {
      ok: true,
      mode: 'dry-run',
      hash,
      includeDirty,
      eligible: candidates.map((r) => ({
        path: r.path,
        branch: r.branch,
        head: r.head,
        verdict: r.verdict,
        dirty: isDirtyVerdict(r.verdict),
        dirtyCount: r.status?.dirtyCount || 0,
      })),
      ineligible,
      next:
        candidates.length > 0
          ? `re-run with COA_OPERATOR=1 ... --teardown-stale --execute${includeDirty ? ' --include-dirty' : ''} (within 1 hour)`
          : 'nothing to teardown',
    };
    if (!silent) {
      if (wantJson) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(
          `coa-worktree --teardown-stale (dry-run${includeDirty ? ', --include-dirty' : ''}): ${candidates.length} eligible`,
        );
        if (cleanCandidates.length > 0) {
          console.log(`  Clean (will delete with --execute):`);
          for (const r of cleanCandidates) console.log(`    ${r.path}  [${r.branch}]  ${r.head}`);
        }
        if (dirtyCandidates.length > 0) {
          const heading = includeDirty
            ? '  Dirty (will delete with --execute --include-dirty):'
            : '  Dirty merged (require --include-dirty to delete):';
          console.log(heading);
          for (const r of dirtyCandidates) {
            console.log(`    ${r.path}  [${r.branch}]  status: ${r.status.dirtyCount} dirty`);
          }
        }
        if (ineligible.length > 0) {
          console.log('');
          console.log(`  skipped (${ineligible.length}):`);
          for (const i of ineligible) {
            console.log(`    ${i.path}  [${i.branch}]  reason: ${i.reason}`);
          }
        }
        if (candidates.length > 0) {
          console.log('');
          console.log(`  marker: ${hash} (valid 1h)`);
          console.log(
            `  next: COA_OPERATOR=1 node scripts/coa-worktree.mjs --teardown-stale --execute${includeDirty ? ' --include-dirty' : ''}`,
          );
        }
      }
    }
    return { exitCode: 0, result };
  }

  // --execute path
  if (process.env.COA_OPERATOR !== '1') {
    return fail('--execute requires COA_OPERATOR=1 in the calling shell');
  }

  const marker = readTeardownMarker(repoRoot, hash);
  if (!marker) {
    return fail(
      'no recent --dry-run marker for this candidate set — run --dry-run first (within 1 hour)',
      { hash },
    );
  }

  const operator = process.env.COA_AGENT || process.env.USER || process.env.USERNAME || 'unknown';
  const torn = [];
  const failures = [];

  for (const r of candidates) {
    // Re-audit at the moment of execution — a stale dry-run could
    // have approved a candidate that has since gained dirty state.
    const fresh = buildAuditRecord(repoRoot, { path: r.path, branch: r.branch }, { trunkBranch });
    if (!eligibilityFn(fresh.verdict)) {
      failures.push({ path: r.path, reason: `re-audit: ${fresh.verdict}` });
      continue;
    }
    // Even with --include-dirty, a candidate that became unmerged
    // between dry-run and execute is no longer eligible — ancestor
    // safety must hold at execute time.
    if (!fresh.isMerged) {
      failures.push({ path: r.path, reason: `re-audit: not merged into trunk` });
      continue;
    }
    if (findClaimReferencingBranch(repoRoot, r.branch)) {
      failures.push({ path: r.path, reason: 'claim acquired between dry-run and execute' });
      continue;
    }

    const dirty = fresh.verdict !== VERDICTS.CLEAN_MERGED;

    // Audit log entry MUST land before the worktree is removed. If
    // the log write fails, abort this candidate (atomic guarantee).
    const auditEvent = {
      ts: new Date().toISOString(),
      event: dirty ? 'worktree-teardown-dirty' : 'worktree-teardown',
      path: r.path,
      branch: r.branch,
      head: r.head,
      verdict: fresh.verdict,
      operator,
    };
    if (dirty) {
      auditEvent.dirty_status_summary = `dirty=${fresh.status.dirtyCount} stamp=${fresh.diffShape.stampOnlyCount} logic=${fresh.diffShape.logicChangedCount}`;
    }
    const logged = appendAuditLog(repoRoot, auditEvent);
    if (!logged) {
      failures.push({ path: r.path, reason: 'audit-log write failed; aborted teardown' });
      continue;
    }

    // For dirty candidates use --force; for clean use plain remove.
    const removeArgs = dirty
      ? ['worktree', 'remove', '--force', r.path]
      : ['worktree', 'remove', r.path];
    const remove = gitIn(repoRoot, removeArgs);
    if (!remove.ok) {
      failures.push({
        path: r.path,
        reason: `git worktree remove failed: ${remove.stderr.trim()}`,
      });
      continue;
    }
    // Defensive cleanup: unset stale core.worktree from main .git/config
    // if it points to the path we just removed (TPL-269).
    unsetStaleCoreWorktree(repoRoot, r.path);
    // Branch delete: -d for clean (merged → succeeds), -D for dirty
    // (force; merged check already passed via isMerged).
    const delBranch = gitIn(repoRoot, ['branch', dirty ? '-D' : '-d', r.branch]);
    torn.push({
      path: r.path,
      branch: r.branch,
      head: r.head,
      branchDeleted: delBranch.ok,
      dirty,
    });
  }

  // Marker is single-use: clean it up so a second --execute cannot
  // ride the same authorization without a fresh --dry-run.
  try {
    rmSync(teardownMarkerPath(repoRoot, hash));
  } catch {
    /* best effort */
  }

  const result = { ok: failures.length === 0, mode: 'execute', torn, failures };
  if (!silent) {
    if (wantJson) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(
        `coa-worktree --teardown-stale (execute): ${torn.length} torn down, ${failures.length} failed`,
      );
      for (const t of torn) {
        console.log(`  removed ${t.path}  [${t.branch}]  branch-deleted=${t.branchDeleted}`);
      }
      for (const f of failures) console.log(`  FAILED ${f.path}  reason: ${f.reason}`);
    }
  }
  return { exitCode: failures.length === 0 ? 0 : 1, result };
}

// ---------------------------------------------------------------------------
// --audit-claims subcommand (TPL-335 / ADR-0051)
// ---------------------------------------------------------------------------

/**
 * Classify every active claim in .claims/ against git history and the
 * anomaly threshold. Read-only by default; --execute requires COA_OPERATOR=1
 * and expires all anomalous-numbering claims.
 *
 * Classifications:
 *   history-confirmed     — slice ID appears in git log; legitimate residue or in-flight
 *   reserved-no-history   — not in git log; recent (<6h) = likely in-flight, older = likely stale
 *   anomalous-numbering   — numeric > gitLogMaxN + ANOMALY_THRESHOLD; near-certain fixture leak
 *
 * Exported for tests.
 *
 * @param {string} repoRoot
 * @param {object} [opts]
 * @param {boolean} [opts.execute]  - expire anomalous claims (requires COA_OPERATOR=1)
 * @param {string}  [opts.prefix]   - limit scan to this prefix (default: all active claims)
 * @returns {{ exitCode: number, rows: Array }}
 */
export function runAuditClaims(repoRoot, opts = {}) {
  const { execute = false } = opts;

  if (execute && process.env.COA_OPERATOR !== '1') {
    console.error('--audit-claims --execute requires COA_OPERATOR=1 in the calling shell');
    return { exitCode: 1, rows: [] };
  }

  const claimsDir = join(repoRoot, '.claims');

  // Gather all active claims
  let entries = [];
  if (existsSync(claimsDir)) {
    try {
      entries = readdirSync(claimsDir);
    } catch {
      entries = [];
    }
  }

  const activeClaims = [];
  for (const name of entries) {
    if (!name.endsWith('.json') || name === 'config.json') continue;
    try {
      const raw = readFileSync(join(claimsDir, name), 'utf8');
      const claim = JSON.parse(raw);
      if (claim.status !== 'active') continue;
      activeClaims.push({ file: name, claim });
    } catch {
      /* skip malformed */
    }
  }

  if (activeClaims.length === 0) {
    console.log('--audit-claims: no active claims found');
    return { exitCode: 0, rows: [] };
  }

  // Collect all unique prefixes present in active claims
  const prefixRe = /^([A-Z][A-Z0-9]+)-(\d+)$/;
  const prefixMaxGit = new Map(); // prefix → gitLogMaxN

  for (const { claim } of activeClaims) {
    const sliceStr = claim.slice || '';
    const m = sliceStr.match(prefixRe);
    if (!m) continue;
    const pfx = m[1];
    if (!prefixMaxGit.has(pfx)) {
      // Scan git log once per prefix
      const histResult = spawnSync('git', ['log', '--all', '--oneline'], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      const histText = histResult.status === 0 ? histResult.stdout || '' : '';
      const re = new RegExp(`\\b${pfx}-(\\d+)\\b`, 'g');
      let gitMax = 0;
      for (const hm of histText.matchAll(re)) {
        const n = Number(hm[1]);
        if (n > gitMax) gitMax = n;
      }
      prefixMaxGit.set(pfx, gitMax);

      // Also build a set of all IDs in history for this prefix
      const idSet = new Set();
      for (const hm of histText.matchAll(re)) idSet.add(`${pfx}-${hm[1]}`);
      prefixMaxGit.set(`${pfx}:idSet`, idSet);
    }
  }

  const now = Date.now();
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  const rows = [];
  const toExpire = [];

  for (const { file, claim } of activeClaims) {
    const sliceStr = claim.slice || '';
    const m = sliceStr.match(prefixRe);
    if (!m) {
      rows.push({
        file,
        slice: sliceStr,
        status: 'no-slice-id',
        classification: 'unknown',
        age: '-',
      });
      continue;
    }
    const pfx = m[1];
    const num = Number(m[2]);
    const gitMax = prefixMaxGit.get(pfx) ?? 0;
    const idSet = prefixMaxGit.get(`${pfx}:idSet`) ?? new Set();

    const createdAt = claim.createdAt ? new Date(claim.createdAt).getTime() : 0;
    const ageMs = createdAt ? now - createdAt : null;
    const ageLabel =
      ageMs === null
        ? 'unknown'
        : ageMs < 60000
          ? `${Math.round(ageMs / 1000)}s`
          : ageMs < 3600000
            ? `${Math.round(ageMs / 60000)}m`
            : `${(ageMs / 3600000).toFixed(1)}h`;

    let classification;
    if (num > gitMax + AUTO_PICK_ANOMALY_THRESHOLD) {
      classification = 'anomalous-numbering';
      toExpire.push({ file, claim });
    } else if (idSet.has(sliceStr)) {
      classification = 'history-confirmed';
    } else {
      // Not in history — determine in-flight vs stale by age
      const likelyInFlight = ageMs !== null && ageMs < SIX_HOURS_MS;
      classification = likelyInFlight
        ? 'reserved-no-history (likely in-flight)'
        : 'reserved-no-history (likely stale/orphaned)';
    }

    rows.push({ file, slice: sliceStr, classification, age: ageLabel });
  }

  // Print table
  const colWidths = {
    file: Math.max(4, ...rows.map((r) => r.file.length)),
    slice: Math.max(5, ...rows.map((r) => r.slice.length)),
    classification: Math.max(14, ...rows.map((r) => r.classification.length)),
    age: Math.max(3, ...rows.map((r) => r.age.length)),
  };
  const pad = (s, n) => s.padEnd(n);
  console.log(
    `${pad('File', colWidths.file)}  ${pad('Slice', colWidths.slice)}  ${pad('Classification', colWidths.classification)}  Age`,
  );
  console.log(
    '-'.repeat(colWidths.file + colWidths.slice + colWidths.classification + colWidths.age + 8),
  );
  for (const r of rows) {
    console.log(
      `${pad(r.file, colWidths.file)}  ${pad(r.slice, colWidths.slice)}  ${pad(r.classification, colWidths.classification)}  ${r.age}`,
    );
  }

  if (toExpire.length > 0 && !execute) {
    console.log(`\n${toExpire.length} anomalous-numbering claim(s) found.`);
    console.log('Re-run with COA_OPERATOR=1 ... --audit-claims --execute to expire them.');
  }

  if (execute) {
    let expiredCount = 0;
    for (const { file, claim } of toExpire) {
      const filePath = join(claimsDir, file);
      try {
        const updated = {
          ...claim,
          status: 'expired',
          expiredAt: new Date().toISOString(),
          expiredReason: 'anomalous-numbering (audit-claims --execute)',
        };
        writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
        appendAuditLog(repoRoot, {
          event: 'claim-expired-anomalous',
          claimFile: file,
          slice: claim.slice,
          reason: 'anomalous-numbering',
          operator: process.env.COA_AGENT || process.env.USER || process.env.USERNAME || 'unknown',
          ts: new Date().toISOString(),
        });
        console.log(`  expired: ${file}  (${claim.slice})`);
        expiredCount++;
      } catch (err) {
        console.error(`  FAILED to expire ${file}: ${err.message}`);
      }
    }
    console.log(`\n--audit-claims --execute: ${expiredCount} claim(s) expired.`);
  }

  return { exitCode: 0, rows };
}

// ---------------------------------------------------------------------------
// Main (only when executed directly)
// ---------------------------------------------------------------------------

function usage() {
  console.error('Usage:');
  console.error(
    '  node scripts/coa-worktree.mjs --create                          (auto-pick slice ID — default)',
  );
  console.error(
    '  node scripts/coa-worktree.mjs --create --slice=<TPL-XXX>        (explicit slice ID)',
  );
  console.error(
    '  node scripts/coa-worktree.mjs --create --auto-pick [--auto-pick-prefix=<PREFIX>]',
  );
  console.error(
    '  node scripts/coa-worktree.mjs --create [--allow-claim-bump]     (bypass anomaly guard — operator override)',
  );
  console.error(
    '  node scripts/coa-worktree.mjs --create --name=<session-name>    (session worktree, no branch)',
  );
  console.error('  node scripts/coa-worktree.mjs --teardown --name=<session-name> [--force]');
  console.error('  node scripts/coa-worktree.mjs --list');
  console.error('  node scripts/coa-worktree.mjs --audit [--json] [--name=<X>] [--trunk=<branch>]');
  console.error(
    '  node scripts/coa-worktree.mjs --audit-claims [--execute]        (classify active claims; --execute expires anomalous ones — requires COA_OPERATOR=1)',
  );
  console.error(
    '  node scripts/coa-worktree.mjs --refresh --name=<X> [--dry-run|--execute] [--json] [--trunk=<branch>]',
  );
  console.error(
    '  node scripts/coa-worktree.mjs --teardown-stale [--dry-run|--execute] [--include-dirty] [--preserve=<branch1,branch2>] [--trunk=<branch>] [--json]',
  );
}

function main() {
  const args = parseWorktreeArgs();
  const wantJson = args.has('--json');

  if (args.has('--create')) {
    const sliceId = args.get('--slice');
    const sessionName = args.get('--name');
    const autoPick = args.has('--auto-pick');
    const autoPickPrefix = args.get('--auto-pick-prefix');
    const allowClaimBump = args.has('--allow-claim-bump');

    if (sliceId && sessionName) {
      const msg = '--slice and --name are mutually exclusive';
      if (wantJson) console.log(JSON.stringify({ ok: false, error: msg }));
      else console.error(`coa-worktree --create: ${msg}`);
      process.exit(1);
    }
    if (sliceId && autoPick) {
      const msg = '--slice and --auto-pick are mutually exclusive; use only one';
      if (wantJson) console.log(JSON.stringify({ ok: false, error: msg }));
      else console.error(`coa-worktree --create: ${msg}`);
      process.exit(1);
    }

    const agentArg = args.get('--agent');
    const { exitCode } = runCreate(ROOT, {
      wantJson,
      sessionName,
      sliceId,
      autoPick,
      autoPickPrefix,
      agent: agentArg,
      enforceAgent: true,
      allowClaimBump,
    });
    process.exit(exitCode);
  } else if (args.has('--audit-claims')) {
    const { exitCode } = runAuditClaims(ROOT, {
      execute: args.has('--execute'),
    });
    process.exit(exitCode);
  } else if (args.has('--teardown-stale')) {
    const { exitCode } = runTeardownStale(ROOT, {
      json: wantJson,
      execute: args.has('--execute'),
      includeDirty: args.has('--include-dirty'),
      preserve: args.get('--preserve'),
      trunk: args.get('--trunk'),
    });
    process.exit(exitCode);
  } else if (args.has('--teardown')) {
    const { exitCode } = runTeardown(ROOT, {
      sessionName: args.get('--name'),
      force: args.has('--force'),
      wantJson,
    });
    process.exit(exitCode);
  } else if (args.has('--audit')) {
    const { exitCode } = runAudit(ROOT, {
      json: wantJson,
      name: args.get('--name'),
      trunk: args.get('--trunk'),
    });
    process.exit(exitCode);
  } else if (args.has('--refresh')) {
    const { exitCode } = runRefresh(ROOT, {
      json: wantJson,
      name: args.get('--name'),
      execute: args.has('--execute'),
      trunk: args.get('--trunk'),
    });
    process.exit(exitCode);
  } else if (args.has('--list')) {
    listCoaWorktrees(ROOT, wantJson);
  } else {
    usage();
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('coa-worktree.mjs') || process.argv[1].endsWith('coa-worktree'));

if (isDirectRun) {
  main();
}
