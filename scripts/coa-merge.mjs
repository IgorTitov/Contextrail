/* @HEADER
 * @version 0.8.5 | 2026-05-11
 * @purpose Merge wrapper — enforces the full commit ceremony with TPL-222 atomicity AND R2 / ADR-0017 transport-branch awareness (auto-detect tx-<slice>, write merge marker, rebase-then-bump, F12 repo-shape-aware ff-update to trunk).
 * @sidecar coa-merge.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * COA Merge Wrapper.
 *
 * Replaces the 9-step manual commit ceremony with a single command
 * that enforces all invariants. Works from inside a worktree or
 * the primary worktree.
 *
 * Usage:
 *   node scripts/coa-merge.mjs --message="feat(gantt): add timeline zoom"
 *   node scripts/coa-merge.mjs --message="fix(auth): token refresh" --push
 *   node scripts/coa-merge.mjs --dry-run --message="..."
 *   node scripts/coa-merge.mjs --json --message="..."
 *
 * TPL-222 atomicity contract:
 *   - Pre-flight (J2) — detects half-baked state from a previous run and
 *     refuses with copy-pasteable recovery before any new work begins.
 *   - Auto-extend (J5) — between steps 2 and 3, the caller's active claim
 *     is extended with VERSION/package.json/CHANGELOG.md plus Phase-5
 *     regen paths so Phase 3 enforcement does not blow up on shared infra
 *     paths the ceremony will stage later.
 *   - Deferred mutation (J1) — VERSION, package.json and CHANGELOG.md are
 *     computed in memory and only written immediately before staging. If
 *     pre-commit fails, all three files are rolled back to HEAD and any
 *     auto-staged ceremony files are unstaged.
 *   - Half-baked marker (J4) — failures at step ≥4 emit
 *     `.cockpit/markers/half-baked-<ts>.json` so the next session can
 *     diagnose the residue without forensics on the working tree.
 *
 * Steps (in order, each must pass):
 *   0. Pre-flight: detect partial state from a previous run (J2)
 *   0.5. Worktree-ownership check (TPL-304): refuse if tx-branch is owned by a different agent
 *   1. Verify staged files exist
 *   2. git pull --rebase origin main
 *   2.5. Auto-extend caller's active claim with ceremony + regen paths (J5)
 *   3. claim-check --enforce --staged (claims valid?)
 *   4. Read VERSION at HEAD, compute next version (in-memory only; no disk writes)
 *   5. Validate CHANGELOG [Unreleased] has content (in-memory only)
 *   6. Compose next CHANGELOG body in memory (no disk writes yet)
 *   7. Atomic write+stage: VERSION + package.json + CHANGELOG.md
 *   8. git commit (pre-commit hook runs all phases; on failure → rollback + J4 marker)
 *   9. claim-check --auto-complete --staged
 *   9b. Write snapshot to .backups/<repo>(<version>).{txt,zip} unless --no-snapshot
 *   9b.5. Transport mode only: propagate .backups/ artifacts to main repo (TPL-270)
 *   9b.6. Transport mode only: propagate session-summary .md files to main repo (TPL-271)
 *   9e. Transport mode only: auto-teardown provably-merged tx-* branches (TPL-283)
 *   9f. Transport mode only: auto-expire stale claims (TPL-283)
 *  10. Optionally git push
 */

import { execSync, spawnSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  copyFileSync,
} from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeReleasedChangelog, extractUnreleased } from './checks/changelog-release.mjs';
import {
  isTransportBranchName,
  isTrunkBranchName,
  mergingMarkerPath,
  mergingMarkerContent,
  classifyFfUpdateMethod,
  composeUpdateInsteadSetupHint,
  findMainWorktree,
  FF_UPDATE_METHODS,
} from './lib/transport-branch.mjs';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
// ROOT is the invocation cwd, not the script's own location. This mirrors
// scripts/checks/release-discipline-check.mjs and lets coa-merge work
// correctly from worktrees, integration test fixtures, or any sub-checkout
// that points its cwd at a real repo root. Earlier versions resolved ROOT
// relative to __dirname which broke worktree+test scenarios silently.
const ROOT = process.cwd();

// MAIN_ROOT resolves to the main repo root even when coa-merge is invoked
// from a linked worktree — used for .claims/ operations (TPL-288).
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

// SCRIPT_DIR is where coa-merge.mjs itself lives. Sibling scripts
// (claim-check.mjs, mergezip.mjs) are invoked via spawnSync as absolute
// paths so the child process locates them regardless of the operator's
// cwd. Required for integration tests where ROOT (the test fixture) is
// not the same as the directory holding the scripts.
const SCRIPT_DIR = __dirname;
const CLAIM_CHECK_SCRIPT = resolve(SCRIPT_DIR, 'checks', 'claim-check.mjs');
const MERGEZIP_SCRIPT = resolve(SCRIPT_DIR, 'mergezip.mjs');

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Parse semver string into { major, minor, patch }.
 */
export function parseSemver(v) {
  const parts = String(v).split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

/**
 * Increment patch version: "0.7.0" -> "0.7.1"
 */
export function bumpPatch(version) {
  const { major, minor, patch } = parseSemver(version);
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Validate that newVersion is exactly +1 from headVersion (patch, minor, or major).
 */
export function isValidBump(headVersion, newVersion) {
  const head = parseSemver(headVersion);
  const expectedPatch = `${head.major}.${head.minor}.${head.patch + 1}`;
  const expectedMinor = `${head.major}.${head.minor + 1}.0`;
  const expectedMajor = `${head.major + 1}.0.0`;
  return (
    newVersion === expectedPatch || newVersion === expectedMinor || newVersion === expectedMajor
  );
}

/**
 * Check if CHANGELOG [Unreleased] has real content.
 */
export function changelogHasContent(changelogText) {
  const start = changelogText.indexOf('## [Unreleased]');
  if (start === -1) return false;
  const afterHeading = start + '## [Unreleased]'.length;
  const nextSection = changelogText.indexOf('\n## ', afterHeading);
  const block =
    nextSection >= 0
      ? changelogText.slice(afterHeading, nextSection)
      : changelogText.slice(afterHeading);
  const content = block.trim();
  if (content === '' || content === '_Nothing yet._' || content === '_none_') return false;
  // Filter out lines that are only section headers (### Added, etc.)
  const realLines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('###'));
  return realLines.length > 0;
}

/**
 * Parse --key=value arguments.
 */
/**
 * Pure helper: should coa-merge attempt `git pull --rebase` given the
 * current `git remote` listing? Returns false when no remote is configured
 * (template-as-template / local-only repo) so the ceremony skips the pull
 * step instead of surfacing scary git errors that don't reflect a real
 * problem.
 */
export function shouldAttemptPull(remoteOutput) {
  if (typeof remoteOutput !== 'string') return false;
  return remoteOutput.trim().length > 0;
}

/**
 * Pure helper: should coa-merge write the post-commit snapshot? Default is
 * yes; --no-snapshot or --dry-run suppresses it. Encapsulates the policy so
 * callers (and tests) can answer the question without re-implementing the
 * flag-precedence logic. (TPL-217)
 */
export function shouldWriteSnapshot({ noSnapshot = false, dryRun = false } = {}) {
  if (dryRun) return false;
  if (noSnapshot) return false;
  return true;
}

/**
 * TPL-265: Capture raw content of a target repo's .git/config before any
 * Step 9c mutation so we can restore it if the push or post-push sequence
 * fails. Returns the file text. Throws when the path is unreadable.
 */
export function captureGitConfig(targetPath) {
  const configPath = join(targetPath, '.git', 'config');
  return readFileSync(configPath, 'utf8');
}

/**
 * TPL-265: Restore a target repo's .git/config from a previously captured
 * snapshot. Called on error in PUSH_UPDATE_INSTEAD to undo any config
 * mutations that occurred between capture and failure.
 */
export function restoreGitConfig(targetPath, configContent) {
  const configPath = join(targetPath, '.git', 'config');
  writeFileSync(configPath, configContent, 'utf8');
}

/**
 * TPL-270: Copy .backups/ artifacts for `version` from the transport worktree
 * into the main repo's .backups/ so they survive worktree teardown.
 *
 * Returns { ok: boolean, copied: string[], message?: string }.
 * Never throws — callers treat this step as non-fatal (same policy as step 9b).
 *
 * The `_fs` parameter exists solely for unit-test injection; production code
 * uses the real fs module helpers passed as the default.
 */
export function propagateBackupsToMainRepo({
  localRoot,
  mainWorktreePath,
  version,
  _fs = { existsSync, readdirSync, mkdirSync, copyFileSync },
} = {}) {
  const localBackupsDir = join(localRoot, '.backups');
  if (!_fs.existsSync(localBackupsDir)) {
    return { ok: false, copied: [], message: 'local .backups/ not found' };
  }

  const versionEsc = version.replace(/\./g, '\\.');
  const pattern = new RegExp(`.*${versionEsc}.*\\.(txt|zip)$`);
  const allFiles = _fs.readdirSync(localBackupsDir);
  const matchingFiles = allFiles.filter((f) => pattern.test(f));

  if (matchingFiles.length === 0) {
    return { ok: false, copied: [], message: `no .backups/ artifacts found for v${version}` };
  }

  const targetBackupsDir = join(mainWorktreePath, '.backups');
  if (!_fs.existsSync(targetBackupsDir)) {
    _fs.mkdirSync(targetBackupsDir, { recursive: true });
  }

  const copied = [];
  for (const file of matchingFiles) {
    const src = join(localBackupsDir, file);
    const dst = join(targetBackupsDir, file);
    if (!_fs.existsSync(dst)) {
      _fs.copyFileSync(src, dst);
    }
    copied.push(file);
  }

  return { ok: true, copied };
}

/**
 * TPL-271: Copy all *.md files from the transport worktree's
 * docs/analysis/session-summaries/ into the main repo's equivalent directory
 * so they survive worktree teardown.
 *
 * Conflict policy: if a target file already exists with *different* content,
 * skip with a warning — prefer conservatism over silent overwrite so the
 * operator can resolve manually. Files that are identical are skipped silently
 * (idempotent).
 *
 * Returns { ok: boolean, copied: string[], skipped: string[], message?: string }.
 * Never throws — callers treat this step as non-fatal (same policy as step 9b).
 *
 * The `_fs` parameter exists solely for unit-test injection.
 */
export function propagateSummariesToMainRepo({
  localRoot,
  mainWorktreePath,
  _fs = { existsSync, readdirSync, mkdirSync, copyFileSync, readFileSync },
} = {}) {
  const SUMMARIES_REL = join('docs', 'analysis', 'session-summaries');
  const localSummariesDir = join(localRoot, SUMMARIES_REL);

  if (!_fs.existsSync(localSummariesDir)) {
    return {
      ok: true,
      copied: [],
      skipped: [],
      message: 'no local session-summaries dir; nothing to propagate',
    };
  }

  const allFiles = _fs.readdirSync(localSummariesDir);
  const mdFiles = allFiles.filter((f) => f.endsWith('.md'));

  if (mdFiles.length === 0) {
    return {
      ok: true,
      copied: [],
      skipped: [],
      message: 'no .md files in session-summaries; nothing to propagate',
    };
  }

  const targetSummariesDir = join(mainWorktreePath, SUMMARIES_REL);
  if (!_fs.existsSync(targetSummariesDir)) {
    _fs.mkdirSync(targetSummariesDir, { recursive: true });
  }

  const copied = [];
  const skipped = [];
  for (const file of mdFiles) {
    const src = join(localSummariesDir, file);
    const dst = join(targetSummariesDir, file);
    if (_fs.existsSync(dst)) {
      const srcContent = _fs.readFileSync(src, 'utf8');
      const dstContent = _fs.readFileSync(dst, 'utf8');
      if (srcContent === dstContent) {
        skipped.push({ file, reason: 'identical' });
      } else {
        skipped.push({ file, reason: 'differs' });
      }
    } else {
      _fs.copyFileSync(src, dst);
      copied.push(file);
    }
  }

  return { ok: true, copied, skipped };
}

/**
 * TPL-283: Parse `git worktree list --porcelain` output and return the
 * worktree path whose checked-out branch matches `branchName`, or null.
 *
 * Porcelain block format (each worktree separated by blank line):
 *   worktree <path>
 *   HEAD <sha>
 *   branch refs/heads/<name>   ← checked-out branch (absent for detached HEAD)
 */
export function findWorktreeForBranch(porcelainOutput, branchName) {
  if (!porcelainOutput || !branchName) return null;
  const lines = String(porcelainOutput).split('\n');
  let currentPath = null;
  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      currentPath = line.slice('worktree '.length).trim();
    } else if (line === '') {
      currentPath = null;
    } else if (line.trim() === `branch refs/heads/${branchName}` && currentPath !== null) {
      return currentPath;
    }
  }
  return null;
}

/**
 * TPL-283: Classify a list of tx-* branch names into merged (ancestor of
 * main) vs unmerged, excluding the current (active) branch.
 *
 * `isAncestorOfMain(branch)` is injected so callers can substitute a git
 * spawn in production or a simple Map lookup in unit tests.
 *
 * @param {object}   opts
 * @param {string[]} opts.allTxBranches    - all tx-* branch names present
 * @param {string}   opts.currentBranch   - active branch (always excluded)
 * @param {(b:string)=>boolean} opts.isAncestorOfMain
 * @returns {{ merged: string[], unmerged: string[] }}
 */
export function classifyTxBranchesForTeardown({
  allTxBranches = [],
  currentBranch,
  isAncestorOfMain,
}) {
  const merged = [];
  const unmerged = [];
  for (const branch of allTxBranches) {
    if (!branch || branch === currentBranch) continue;
    if (isAncestorOfMain(branch)) {
      merged.push(branch);
    } else {
      unmerged.push(branch);
    }
  }
  return { merged, unmerged };
}

/**
 * TPL-265: Validate that `branchName` is a tx-* transport branch before
 * executing PUSH_UPDATE_INSTEAD. Throws with operator-actionable message
 * when invoked from wrong branch. Exported for unit testing.
 */
export function validatePushUpdateInsteadWorktree(branchName) {
  if (!isTransportBranchName(branchName)) {
    throw new Error(
      `Step 9c PUSH_UPDATE_INSTEAD must run from a tx-* transport worktree, ` +
        `got branch '${branchName}'. Refusing to mutate target repo config.`,
    );
  }
}

/**
 * Default ceremony files that coa-merge writes during steps 5-7. The user
 * does not stage these; coa-merge stages them on the user's behalf as part
 * of every atomic commit. Threaded through resolveAutoExtendPaths() so the
 * caller's claim covers them before pre-commit Phase 3 enforces.
 */
export const DEFAULT_CEREMONY_FILES = ['VERSION', 'package.json', 'CHANGELOG.md'];

/**
 * Default Phase-5 regen paths that pre-commit hooks rewrite mid-commit and
 * then re-stage. If the caller's claim does not cover these, Phase-3
 * enforcement (run from inside pre-commit) flags them as protected files
 * lacking a claim. Threaded through resolveAutoExtendPaths().
 *
 * Mirrors the regenerated artifacts from:
 *   - `scripts/agent-contract/sync.mjs` → AGENTS.md, .cursorrules
 *   - TPL-209 LOCAL/MICRO sync → LOCAL.md, MICRO.md
 *   - TPL-220 dependency-graph regen → docs/_generated/dependency-graph.json
 *   - TPL-220 spec-index regen → docs/_generated/spec-index.json
 *   - backlog index regen → docs/backlog/_generated/index.md, backlog.json
 */
export const DEFAULT_REGEN_PATHS = [
  'AGENTS.md',
  '.cursorrules',
  'LOCAL.md',
  'MICRO.md',
  'docs/_generated/dependency-graph.json',
  'docs/_generated/spec-index.json',
  'docs/backlog/_generated/index.md',
  'docs/backlog/_generated/backlog.json',
];

/**
 * Re-stage files that git's --autostash may have dropped from the index.
 *
 * `git rebase --autostash` saves staged+WD changes via git stash, then after
 * the rebase applies them with `git stash apply` (no --index flag), which
 * restores the working tree only — the index is left empty. Calling this
 * after any --autostash step restores the index state for the listed paths.
 *
 * Only re-stages paths that exist on disk after the rebase; deleted files are
 * silently skipped. (TPL-250)
 */
export function restageAfterAutostash(files, cwd) {
  const root = cwd || ROOT;
  const toStage = (files || []).filter((f) => existsSync(join(root, String(f))));
  if (toStage.length === 0) return { ok: true, count: 0 };
  const r = spawnSync('git', ['add', '--', ...toStage], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  return { ok: r.status === 0, count: toStage.length };
}

/**
 * Pure helper: resolve which paths the caller's claim should be auto-extended
 * with, given the user's already-staged set, the ceremony files coa-merge
 * will stage at step 7, the regen paths Phase-5 hooks will mutate, and
 * sidecar .header.md pairs for every staged source file.
 *
 * Ceremony files (VERSION, package.json, CHANGELOG.md) are ALWAYS included
 * unconditionally — even when pre-staged by the operator. These are protected
 * paths owned by coa-merge; filtering them caused a Phase-3 block when an
 * operator pre-staged CHANGELOG.md before running coa-merge (TPL-252).
 *
 * Regen paths are still filtered when pre-staged (they are in the original
 * claim's coverage via the staged set and re-adding them would be noise).
 *
 * Sidecar pairs: for each staged source path, if <path>.header.md exists,
 * it is added to the extend list. Phase 5 stamps @version on both source and
 * sidecar; if the sidecar is staged without a claim the operator would need
 * to add it manually. J5 pre-empts that by extending automatically (TPL-252).
 *
 * Returns a deduplicated array of forward-slash paths.
 *
 * @param {object}   opts
 * @param {string[]} opts.filesUserStaged  - Paths currently in the git index.
 * @param {string[]} opts.ceremonyFiles    - FILES coa-merge stages at step 7.
 * @param {string[]} opts.regenPaths       - Paths Phase-5 regenerates.
 * @param {Function} opts.sidecarExists    - Injected predicate for tests;
 *   defaults to existsSync(join(ROOT, p)). Receives a forward-slash path
 *   relative to the repo root.
 */
export function resolveAutoExtendPaths({
  filesUserStaged = [],
  ceremonyFiles = DEFAULT_CEREMONY_FILES,
  regenPaths = DEFAULT_REGEN_PATHS,
  sidecarExists = null,
} = {}) {
  const checkSidecar = sidecarExists ?? ((p) => existsSync(join(ROOT, p)));
  const stagedSet = new Set((filesUserStaged || []).map((f) => String(f).replaceAll('\\', '/')));
  const out = [];
  const seen = new Set();

  // Ceremony files: always extend, never filter — they are protected paths that
  // coa-merge owns; the claim must cover them even when pre-staged (TPL-252).
  for (const p of ceremonyFiles || []) {
    if (typeof p !== 'string' || p.length === 0) continue;
    const norm = p.replaceAll('\\', '/');
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }

  // Regen paths: skip if already staged (original claim coverage, no noise).
  for (const p of regenPaths || []) {
    if (typeof p !== 'string' || p.length === 0) continue;
    const norm = p.replaceAll('\\', '/');
    if (stagedSet.has(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }

  // Sidecar pairs: extend with .header.md ONLY for header-eligible extensions
  // (not .json, .lock, .png, etc.), skipping ceremony/regen files (managed
  // separately), and ONLY when already staged (operator pre-staged it) OR when
  // the sidecar doesn't exist yet (new file needing a new sidecar).
  const ceremonyNormSet = new Set(
    (ceremonyFiles || []).map((p) => String(p).replaceAll('\\', '/')),
  );
  const regenNormSet = new Set((regenPaths || []).map((p) => String(p).replaceAll('\\', '/')));
  for (const f of filesUserStaged || []) {
    const norm = String(f).replaceAll('\\', '/');
    if (!norm) continue;
    if (!/\.(mjs|js|mts|ts|tsx|md|sh|bash)$/.test(norm)) continue;
    if (ceremonyNormSet.has(norm) || regenNormSet.has(norm)) continue;
    const sidecar = `${norm}.header.md`;
    if (seen.has(sidecar)) continue;
    const alreadyStaged = stagedSet.has(sidecar);
    const isNew = !checkSidecar(sidecar);
    if (alreadyStaged || isNew) {
      seen.add(sidecar);
      out.push(sidecar);
    }
  }

  return out;
}

/**
 * Pure helper: does the given CHANGELOG text already contain a versioned
 * section heading for `version`? Used by detectPartialState() to recognize
 * the half-baked-commit signature where step 6 (changelog-release) ran
 * but step 8 (commit) never landed.
 */
export function hasVersionedSection(changelogText, version) {
  if (typeof changelogText !== 'string' || typeof version !== 'string') return false;
  const escaped = version.replace(/\./g, '\\.');
  // Match "## [X.Y.Z]" at line start, optionally followed by a separator + date.
  return (
    new RegExp(`(^|\\n)##\\s+\\[${escaped}\\][\\s—\\-]`, 'm').test(changelogText) ||
    new RegExp(`(^|\\n)##\\s+\\[${escaped}\\]\\s*$`, 'm').test(changelogText)
  );
}

/**
 * Pure helper: classify the working-tree state at coa-merge entry. Three
 * results:
 *
 *   - kind: 'normal'      — VERSION matches HEAD; nothing to recover from
 *   - kind: 'half-baked'  — VERSION is exactly +1 from HEAD AND CHANGELOG
 *                            already has the [wtVersion] section AND
 *                            [Unreleased] is empty. Signature of Entry-010:
 *                            steps 4-6 ran, step 8 did not. Operator must
 *                            either resume the commit or revert.
 *   - kind: 'partial'     — VERSION differs from HEAD but does not match
 *                            the half-baked signature. Could be hand-edited
 *                            VERSION, mid-rebase state, etc. Caller decides.
 *
 * No I/O. Caller passes the three observables.
 */
export function detectPartialState({ headVersion, wtVersion, changelogText } = {}) {
  if (!headVersion || !wtVersion) {
    return {
      partial: false,
      kind: 'normal',
      headVersion: headVersion || null,
      wtVersion: wtVersion || null,
    };
  }
  if (wtVersion === headVersion) {
    return { partial: false, kind: 'normal', headVersion, wtVersion };
  }
  const expectedNext = bumpPatch(headVersion);
  const isExpectedBump = wtVersion === expectedNext;
  const wtSectionPresent = hasVersionedSection(String(changelogText || ''), wtVersion);
  const unreleasedEmpty = !changelogHasContent(String(changelogText || ''));
  if (isExpectedBump && wtSectionPresent && unreleasedEmpty) {
    return { partial: true, kind: 'half-baked', headVersion, wtVersion };
  }
  return { partial: true, kind: 'partial', headVersion, wtVersion };
}

/**
 * C5 / TPL-286 — pure helper: detect duplicate versioned section headings in
 * CHANGELOG text. Returns null when all versions are unique; returns
 * { version, occurrences: [{ version, line }, ...] } for the first duplicate.
 *
 * Used by coa-merge step 0 M2 half-baked detection so a manual duplicate edit
 * is surfaced before any ceremony begins.
 */
export function detectChangelogDuplicates(changelogText) {
  if (typeof changelogText !== 'string' || !changelogText) return null;
  const lines = changelogText.split('\n');
  const seen = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+\[([^\]]+)\]/);
    if (m && m[1] !== 'Unreleased') {
      const version = m[1];
      const entry = { version, line: i + 1 };
      if (!seen.has(version)) {
        seen.set(version, [entry]);
      } else {
        seen.get(version).push(entry);
      }
    }
  }
  for (const [version, occurrences] of seen) {
    if (occurrences.length > 1) return { version, occurrences };
  }
  return null;
}

/**
 * TPL-304: Read the .coa-session file from a worktree root. Returns the
 * parsed metadata object or null when absent or unreadable.
 */
export function readCoaSession(worktreeRoot, _read = readFileSync) {
  try {
    const text = _read(join(worktreeRoot, '.coa-session'), 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * TPL-304: Resolve caller agent identity from parsed CLI args and env.
 * Priority: --agent=<name> flag → COA_AGENT env var → null (unknown).
 */
export function resolveCallerAgent(parsedArgs, env = process.env) {
  const fromFlag = parsedArgs ? parsedArgs.get('--agent') : null;
  if (fromFlag) return fromFlag;
  const fromEnv = env && env.COA_AGENT ? String(env.COA_AGENT).trim() : null;
  return fromEnv || null;
}

/**
 * TPL-304 / C6: Verify worktree ownership for transport-mode coa-merge.
 * Compares .coa-session.agent to callerAgent to prevent one session from
 * running coa-merge inside another session's tx-worktree (ZVX-DEV-101 class).
 *
 * Returns { ok, reason, message?, overrideApplied? }.
 * reason values: 'no-branch' | 'not-tx-branch' | 'no-active-claim' |
 *                'agent-unknown' | 'agent-mismatch' | 'verified'
 *
 * @param {object}      opts
 * @param {string|null} opts.branch        - current branch name (null = detached HEAD)
 * @param {string|null} opts.callerAgent   - resolved caller identity (null = unknown)
 * @param {object|null} opts.session       - parsed .coa-session (null = file absent)
 * @param {boolean}     opts.allowForeign  - true when COA_OPERATOR=1 + COA_ALLOW_FOREIGN_WORKTREE=1
 */
export function verifyWorktreeOwnership({
  branch,
  callerAgent,
  session,
  allowForeign = false,
} = {}) {
  if (!branch || branch === 'HEAD') {
    return { ok: true, reason: 'no-branch' };
  }
  if (!branch.startsWith('tx-')) {
    return { ok: true, reason: 'not-tx-branch' };
  }

  const sliceId = branch.replace(/^tx-/, '');

  if (!session) {
    return {
      ok: false,
      reason: 'no-active-claim',
      message: [
        `coa-merge: tx-branch '${branch}' has no .coa-session file.`,
        `This worktree was not created via 'coa-worktree --create'.`,
        `Recovery — create a properly-owned worktree:`,
        `  node scripts/coa-worktree.mjs --create --slice=${sliceId}`,
        `Override (operator only): COA_OPERATOR=1 COA_ALLOW_FOREIGN_WORKTREE=1`,
      ].join('\n'),
    };
  }

  if (!callerAgent) {
    if (!allowForeign) {
      return {
        ok: false,
        reason: 'agent-unknown',
        message: [
          `coa-merge: tx-branch '${branch}' requires a caller agent identity.`,
          `Pass --agent=<role> (e.g., --agent=feature-implementer) or set COA_AGENT.`,
          `Expected agent from .coa-session: '${session.agent}'.`,
          `Override (operator only): COA_OPERATOR=1 COA_ALLOW_FOREIGN_WORKTREE=1`,
        ].join('\n'),
      };
    }
    return { ok: true, reason: 'verified', overrideApplied: true };
  }

  if (session.agent !== callerAgent) {
    if (!allowForeign) {
      return {
        ok: false,
        reason: 'agent-mismatch',
        message: [
          `coa-merge: tx-branch '${branch}' is owned by agent='${session.agent}'.`,
          `Your agent='${callerAgent}'. Cannot run coa-merge in another agent's worktree.`,
          `Recovery — create your own worktree:`,
          `  node scripts/coa-worktree.mjs --create`,
          `Override (operator only): COA_OPERATOR=1 COA_ALLOW_FOREIGN_WORKTREE=1`,
        ].join('\n'),
      };
    }
    return { ok: true, reason: 'verified', overrideApplied: true };
  }

  return { ok: true, reason: 'verified', overrideApplied: false };
}

/**
 * R2 / ADR-0017 — pure helper: classify the current branch into one of
 * three coa-merge modes:
 *
 *   - 'trunk'         → branch is main/master; existing pre-R2 flow
 *                       runs unchanged (bump in place, no marker, no
 *                       rebase, no ff-push or branch-delete).
 *   - 'transport'     → branch is tx-<slice>; full transport flow:
 *                       rebase, write marker, bump, commit, ff-merge
 *                       into trunk, delete branch, remove marker.
 *   - 'unknown'       → anything else; coa-merge refuses to proceed
 *                       because the new pre-commit phase 2.7 will
 *                       refuse the commit anyway.
 *
 * Pure-function classification — no git calls, no I/O. Tests pass the
 * branch name directly.
 */
export function classifyCoaMergeMode(branch) {
  if (typeof branch !== 'string' || branch.length === 0) return 'unknown';
  if (isTrunkBranchName(branch)) return 'trunk';
  if (isTransportBranchName(branch)) return 'transport';
  return 'unknown';
}

export function parseMergeArgs(argv = process.argv.slice(2)) {
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

// ---------------------------------------------------------------------------
// Step runner
// ---------------------------------------------------------------------------

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    stdio: opts.stdio || 'pipe',
    shell: false,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    status: result.status,
  };
}

/**
 * Write a worktree-ownership-override entry to .claims/audit.log (TPL-304 C6).
 * Called whenever COA_OPERATOR=1 COA_ALLOW_FOREIGN_WORKTREE=1 bypasses the
 * ownership check so every override is traceable. Best-effort — never blocks.
 */
function writeOwnershipOverrideAuditEntry({ branch, sliceId, callerAgent, session }) {
  try {
    const auditPath = join(MAIN_ROOT, '.claims', 'audit.log');
    const entry = JSON.stringify({
      event: 'worktree-ownership-override',
      branch,
      sliceId,
      callerAgent: callerAgent || null,
      sessionAgent: session ? session.agent : null,
      timestamp: new Date().toISOString(),
    });
    appendFileSync(auditPath, entry + '\n', 'utf8');
  } catch {
    /* telemetry is best-effort, never blocks the workflow */
  }
}

/**
 * Emit a collision telemetry marker to .cockpit/markers/ for dashboard aggregation.
 */
function emitCollisionMarker(step, message) {
  try {
    const markersDir = join(ROOT, '.cockpit', 'markers');
    mkdirSync(markersDir, { recursive: true });
    const marker = {
      type: 'parallel-collision',
      step,
      message,
      agent: process.env.COA_AGENT || 'unknown',
      timestamp: new Date().toISOString(),
    };
    const filename = `collision-${Date.now()}.json`;
    writeFileSync(join(markersDir, filename), JSON.stringify(marker, null, 2) + '\n');
  } catch {
    /* telemetry is best-effort, never blocks the workflow */
  }
}

function fail(step, message, wantJson) {
  emitCollisionMarker(step, message);
  if (wantJson) {
    console.log(JSON.stringify({ ok: false, failedStep: step, error: message }));
  } else {
    console.error(`coa-merge: FAILED at step ${step}`);
    console.error(`  ${message}`);
  }
  process.exit(1);
}

/**
 * Emit a half-baked-state marker to .cockpit/markers/half-baked-<ts>.json
 * (TPL-222 J4). Distinct from collision-<ts>.json so dashboards can isolate
 * "interrupted commit" residue from generic step failures. Best-effort —
 * never blocks the workflow.
 */
function emitHalfBakedMarker(ctx) {
  try {
    const markersDir = join(ROOT, '.cockpit', 'markers');
    mkdirSync(markersDir, { recursive: true });
    const marker = {
      type: 'half-baked-commit',
      stepFailed: ctx.stepFailed,
      headVersion: ctx.headVersion || null,
      workingTreeVersion: ctx.workingTreeVersion || null,
      changelogReleased: !!ctx.changelogReleased,
      claimId: ctx.claimId || null,
      agent: ctx.agent || process.env.COA_AGENT || 'unknown',
      timestamp: new Date().toISOString(),
      recoveryHint:
        'Run: git restore VERSION CHANGELOG.md package.json; rerun coa-merge with corrected --message',
    };
    const filename = `half-baked-${Date.now()}.json`;
    writeFileSync(join(markersDir, filename), JSON.stringify(marker, null, 2) + '\n');
  } catch {
    /* telemetry is best-effort, never blocks the workflow */
  }
}

/**
 * Read VERSION at HEAD via `git show HEAD:VERSION`. Returns null when no
 * HEAD commit exists yet (first-commit case) or git is unavailable.
 */
function readHeadVersion() {
  try {
    return execSync('git show HEAD:VERSION', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Read working-tree VERSION. Returns null on read error.
 */
function readWorkingTreeVersion() {
  try {
    return readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Read working-tree CHANGELOG.md. Returns empty string on read error so
 * downstream pure helpers see a deterministic value.
 */
function readChangelog() {
  try {
    return readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
  } catch {
    return '';
  }
}

/**
 * TPL-311: Tier weights for `pickCallerClaim` disambiguation. Tier 1
 * (agent identity) outranks Tier 2 (slice match) outranks Tier 3 (target
 * overlap). Weights are spaced wide enough that a higher tier always
 * beats any combination of lower tiers, given realistic claim counts.
 *
 *   Tier 1 — exact callerAgent === claim.agent match: 1000
 *   Tier 2 — exact slice === claim.slice match:        500
 *   Tier 3 — per overlapping staged target:             10
 *   Tier 4 — recency tiebreaker (created ms / 1e15):  ~1.7e-3
 *
 * The recency contribution is intentionally tiny: it disambiguates
 * otherwise-identical scores deterministically without ever overriding
 * a discriminating signal in tiers 1-3 (closes TPL-280 Incident #2).
 */
export const PICK_CALLER_CLAIM_TIERS = Object.freeze({
  AGENT_MATCH: 1000,
  SLICE_MATCH: 500,
  TARGET_OVERLAP: 10,
});

/**
 * TPL-311: Pure tiered-scoring picker for the caller's active claim.
 *
 * Given a list of `claims` (already loaded from disk or constructed in
 * tests), pick the one most likely to be the caller's. Scoring tiers
 * (additive):
 *
 *   - Tier 1 — claim.agent === callerAgent
 *   - Tier 2 — claim.slice === slice
 *   - Tier 3 — count of claim.targets[].path that appear in stagedFiles
 *   - Tier 4 — created-time tiebreaker only
 *
 * Returns `{ ok: true, claim }` on a unique winner, or
 * `{ ok: false, reason: 'not-found' | 'ambiguous' | 'override-not-found',
 *   candidates }` otherwise.
 *
 * `claimIdOverride` (operator escape hatch — `--claim-id=<id>`) bypasses
 * scoring: the matching claim wins regardless of agent, slice, target,
 * or recency. The override still requires `status === 'active'` and a
 * non-expired `expires` field — operators must not extend a closed
 * claim through this path.
 *
 * Pure function: no I/O, no `Date.now()` calls. Tests pass a frozen
 * `now` for deterministic expiry filtering.
 */
export function pickCallerClaim({
  claims = [],
  callerAgent = null,
  slice = null,
  stagedFiles = [],
  claimIdOverride = null,
  now = new Date(),
} = {}) {
  const stagedSet = new Set((stagedFiles || []).map((f) => String(f).replaceAll('\\', '/')));
  const isLive = (c) => {
    if (!c || c.status !== 'active') return false;
    if (c.expires) {
      const exp = new Date(c.expires);
      if (!Number.isNaN(exp.getTime()) && exp < now) return false;
    }
    return true;
  };

  const live = (claims || []).filter(isLive);

  // Operator override: --claim-id=<id> short-circuits scoring entirely.
  if (claimIdOverride) {
    const match = live.find((c) => c.id === claimIdOverride);
    if (match) return { ok: true, claim: match, reason: 'override' };
    return {
      ok: false,
      reason: 'override-not-found',
      candidates: live,
    };
  }

  // Restrict to claims that actually cover at least one staged file —
  // matches pre-fix behavior (claims with no overlap are not the
  // caller's). Empty stagedSet → no match path.
  if (stagedSet.size === 0) {
    return { ok: false, reason: 'not-found', candidates: [] };
  }
  const intersecting = live.filter((c) => {
    const targets = Array.isArray(c.targets) ? c.targets : [];
    return targets.some((t) => {
      const p = typeof t === 'string' ? t : t && t.path;
      return p && stagedSet.has(String(p).replaceAll('\\', '/'));
    });
  });

  if (intersecting.length === 0) {
    return { ok: false, reason: 'not-found', candidates: [] };
  }
  if (intersecting.length === 1) {
    // Single-claim path: returns it without scoring (regression-proof).
    return { ok: true, claim: intersecting[0], reason: 'unambiguous' };
  }

  // Tier scoring.
  const scored = intersecting.map((c) => {
    let score = 0;
    if (callerAgent && c.agent === callerAgent) {
      score += PICK_CALLER_CLAIM_TIERS.AGENT_MATCH;
    }
    if (slice && c.slice === slice) {
      score += PICK_CALLER_CLAIM_TIERS.SLICE_MATCH;
    }
    const targets = Array.isArray(c.targets) ? c.targets : [];
    const overlap = targets.reduce((n, t) => {
      const p = typeof t === 'string' ? t : t && t.path;
      return p && stagedSet.has(String(p).replaceAll('\\', '/')) ? n + 1 : n;
    }, 0);
    score += overlap * PICK_CALLER_CLAIM_TIERS.TARGET_OVERLAP;
    // Tier 4 — recency tiebreaker (tiny additive). Spec: never overrides
    // a discriminating tier 1/2/3 signal, only resolves true tiebreaks.
    const created = c.created ? new Date(c.created).getTime() : 0;
    score += (Number.isFinite(created) ? created : 0) / 1e15;
    return { claim: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Ambiguous when the top two scores are exactly equal (same agent +
  // slice + overlap + created ms). Surfacing this refuses silent
  // wrong-claim extension; operator must pass `--claim-id=<id>`.
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return {
      ok: false,
      reason: 'ambiguous',
      candidates: scored.map((s) => s.claim),
    };
  }
  return { ok: true, claim: scored[0].claim, reason: 'scored' };
}

/**
 * TPL-311: Find the caller's active claim using tiered scoring.
 *
 * Loads local claims from `MAIN_ROOT/.claims` and delegates ranking to
 * the pure `pickCallerClaim`. Pre-TPL-311 picked the most-recently-
 * created intersecting claim, which let a parallel session's claim
 * created 1ms after the caller's (and intersecting on
 * VERSION/CHANGELOG.md/package.json) be silently extended (TPL-280
 * Incident #2). Now agent identity > slice match > target overlap >
 * recency.
 *
 * Returns the same shape as `pickCallerClaim`: `{ ok, claim?, reason,
 * candidates? }`. The caller (step 2.5) maps `not-found` /
 * `override-not-found` / `ambiguous` to specific failure messages.
 */
function findCallerActiveClaim(stagedFiles, opts = {}) {
  const dir = join(MAIN_ROOT, '.claims');
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return { ok: false, reason: 'not-found', candidates: [] };
  }
  const claims = [];
  for (const f of entries) {
    if (!f.endsWith('.json')) continue;
    try {
      const claim = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (claim) claims.push(claim);
    } catch {
      // skip unreadable / malformed claim files
    }
  }
  return pickCallerClaim({
    claims,
    stagedFiles,
    callerAgent: opts.callerAgent || null,
    slice: opts.slice || null,
    claimIdOverride: opts.claimIdOverride || null,
  });
}

/**
 * Capture the pre-mutation working-tree contents of the ceremony files so a
 * later rollback can restore exactly what the operator had staged + edited
 * before coa-merge step 7 wrote VERSION+package.json+CHANGELOG.md. Returns a
 * Map<filename, content|null>. A null entry means the file did not exist
 * pre-mutation (rare — VERSION/package.json/CHANGELOG.md exist in any
 * coa-managed repo).
 */
function snapshotCeremonyFiles(files) {
  const snap = new Map();
  for (const f of files) {
    try {
      snap.set(f, readFileSync(join(ROOT, f), 'utf8'));
    } catch {
      snap.set(f, null);
    }
  }
  return snap;
}

/**
 * Restore working-tree files to a previously-captured pre-mutation snapshot
 * (preferred) and unstage them. Used by J1 rollback after a failed
 * pre-commit so the working tree is left exactly as it was before step 7
 * wrote the next-version content — preserving any pre-staged user edits to
 * CHANGELOG [Unreleased] etc. Falls back to `git show HEAD:<path>` when no
 * snapshot is available. Best-effort: failures during rollback (e.g. git
 * unavailable) are surfaced as a separate warning so the operator knows
 * manual recovery is required.
 */
function rollbackCeremonyFiles(files, snapshot) {
  const failures = [];
  for (const f of files) {
    const fromSnapshot = snapshot && snapshot.get ? snapshot.get(f) : null;
    if (typeof fromSnapshot === 'string') {
      try {
        writeFileSync(join(ROOT, f), fromSnapshot, 'utf8');
        continue;
      } catch (err) {
        failures.push({ file: f, reason: err.message || String(err) });
        continue;
      }
    }
    // Snapshot unavailable — fall back to HEAD content.
    try {
      const headContent = execSync(`git show HEAD:${f}`, { cwd: ROOT, encoding: 'utf8' });
      writeFileSync(join(ROOT, f), headContent, 'utf8');
    } catch (err) {
      failures.push({ file: f, reason: err.message || String(err) });
    }
  }
  // Unstage only these specific paths — other staged files (the user's
  // slice) are left intact so the next coa-merge invocation can resume.
  run('git', ['reset', 'HEAD', '--', ...files]);
  return { ok: failures.length === 0, failures };
}

function log(message, wantJson) {
  if (!wantJson) console.log(`  ${message}`);
}

/**
 * Write the R2 / ADR-0017 ceremony marker. Returns the absolute path.
 * Caller is responsible for cleanup on success AND failure paths.
 */
function writeMergingMarker(repoRoot, branch) {
  const path = mergingMarkerPath(repoRoot);
  const content = mergingMarkerContent({
    pid: process.pid,
    branch,
    ts: Date.now(),
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

function removeMergingMarker(repoRoot) {
  const path = mergingMarkerPath(repoRoot);
  try {
    rmSync(path);
  } catch {
    /* best effort */
  }
}

/**
 * Detect the current branch via `git rev-parse --abbrev-ref HEAD`.
 * Returns null on detached HEAD or git failure — main() refuses to
 * proceed in either case.
 */
function detectCurrentBranch() {
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (!out || out === 'HEAD') return null;
    return out;
  } catch {
    return null;
  }
}

/**
 * Local mirror of changelog-release.mjs's `releaseTimestamp()`. Inlined so
 * coa-merge can compose the next CHANGELOG body in memory (J1 deferred
 * mutation) instead of shelling out to the script which writes immediately.
 * Format: "YYYY-MM-DD HH:MM:SS UTC±H[:MM]" — matches Keep-a-Changelog flavour.
 */
function formatReleaseTimestamp(now = new Date()) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const tz = absM === 0 ? `UTC${sign}${absH}` : `UTC${sign}${absH}:${pad(absM)}`;
  return `${date} ${time} ${tz}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseMergeArgs();
  const wantJson = args.has('--json');
  const dryRun = args.has('--dry-run');
  const wantPush = args.has('--push');
  const wantNoSnapshot = args.has('--no-snapshot');
  const commitMessage = args.get('--message');

  if (!commitMessage) {
    fail(0, '--message="commit message" is required', wantJson);
  }

  if (!wantJson) console.log('coa-merge: starting commit ceremony...');

  // ---------------------------------------------------------------------
  // Step 0.4: R2 / ADR-0017 — branch detection + mode classification.
  //
  // Trunk: existing flow runs unchanged.
  // Transport (tx-<slice>): write marker before step 7, rebase main
  //                          before step 7, ff-push to main after step 9.
  // Unknown: refuse — pre-commit phase 2.7 would refuse anyway, and
  //           coa-merge can give a much better error message here.
  // ---------------------------------------------------------------------
  const branchAtEntry = detectCurrentBranch();
  if (!branchAtEntry) {
    fail(
      0,
      'Cannot determine current branch (detached HEAD?). coa-merge requires a branch.',
      wantJson,
    );
  }
  const coaMergeMode = classifyCoaMergeMode(branchAtEntry);
  if (coaMergeMode === 'unknown') {
    fail(
      0,
      [
        `Refusing to proceed on branch "${branchAtEntry}" (R2 / ADR-0017).`,
        '',
        'Commits land on either:',
        '  - main / master (trunk)',
        '  - tx-<slice> transport branches created via:',
        '      node scripts/coa-worktree.mjs --create --slice=<TPL-XXX>',
        '',
        'Switch branches and rerun coa-merge.',
      ].join('\n'),
      wantJson,
    );
  }
  if (!wantJson) console.log(`  mode: ${coaMergeMode} (branch: ${branchAtEntry})`);

  // Register marker cleanup so any unexpected exit removes the lock.
  // No-op when the marker was never written (trunk mode or transport
  // mode that aborted before step 6.5).
  let markerWritten = false;
  const cleanupMarker = () => {
    if (markerWritten) {
      removeMergingMarker(ROOT);
      markerWritten = false;
    }
  };
  process.on('exit', cleanupMarker);

  // ---------------------------------------------------------------------
  // Step 0: Pre-flight detect-and-resume (TPL-222 J2)
  //
  // If a previous coa-merge run mutated VERSION + CHANGELOG but never
  // committed, every signal in the working tree lies: VERSION says
  // "we're on X.Y.Z" but git HEAD is still on X.Y.(Z-1) and the
  // [Unreleased] block is empty because changelog-release moved its
  // contents to [X.Y.Z]. Refuse to proceed and emit copy-pasteable
  // recovery instructions instead of starting a second compounding
  // failure on top of the first.
  // ---------------------------------------------------------------------
  const headVersionAtEntry = readHeadVersion();
  const wtVersionAtEntry = readWorkingTreeVersion();
  const changelogAtEntry = readChangelog();
  const partial = detectPartialState({
    headVersion: headVersionAtEntry,
    wtVersion: wtVersionAtEntry,
    changelogText: changelogAtEntry,
  });
  if (partial.partial && partial.kind === 'half-baked') {
    fail(
      0,
      [
        'Detected partial state from previous coa-merge run:',
        `  HEAD VERSION = ${partial.headVersion}`,
        `  Working tree VERSION = ${partial.wtVersion}`,
        `  CHANGELOG already has [${partial.wtVersion}] section, [Unreleased] empty`,
        '',
        'Recovery options:',
        '  1. Resume: re-stage your slice files and run:',
        `       git commit -m "<your message>"`,
        '     The pre-commit hook will validate; snapshot will run via post-commit.',
        '  2. Abort: revert the partial state with:',
        '       git restore VERSION CHANGELOG.md package.json',
        '     Then re-run coa-merge with corrected --message.',
      ].join('\n'),
      wantJson,
    );
  }

  // C5 / TPL-286 — Changelog version-uniqueness pre-flight (M2 vector 4).
  // A manual edit or double-invocation of changelog-release can create two
  // `## [X.Y.Z]` sections. Refuse before any ceremony begins, since composeReleasedChangelog
  // would compound the corruption by inserting a third section.
  const changelogDupe = detectChangelogDuplicates(changelogAtEntry);
  if (changelogDupe) {
    const lines = changelogDupe.occurrences.map((o) => `line ${o.line}`).join(', ');
    fail(
      0,
      [
        `CHANGELOG.md has duplicate version sections (C5 invariant violated):`,
        `  ## [${changelogDupe.version}] appears ${changelogDupe.occurrences.length} times (${lines})`,
        '',
        'Recovery options:',
        '  1. Remove the older duplicate section from CHANGELOG.md manually',
        '  2. Or revert: git restore CHANGELOG.md',
        '     Then re-release once via: node scripts/checks/changelog-release.mjs --version=<N>',
      ].join('\n'),
      wantJson,
    );
  }

  // Step 0.5: Worktree-ownership check (TPL-304 / C6).
  //
  // Closes the worktree-theft class observed in Zvenix ZVX-DEV-101: an agent
  // cd-ed into a foreign tx-worktree and committed partial work, breaking main
  // with a missing import. Step 0.5 refuses coa-merge when the caller's agent
  // identity does not match the worktree's .coa-session owner.
  //
  // Only fires in transport mode (tx-* branch). Trunk-mode commits (main/master
  // direct) and detached-HEAD states are passed through without a check.
  if (coaMergeMode === 'transport') {
    const callerAgent = resolveCallerAgent(args);
    const allowForeign =
      process.env.COA_OPERATOR === '1' && process.env.COA_ALLOW_FOREIGN_WORKTREE === '1';
    const session = readCoaSession(ROOT);
    const sliceId = branchAtEntry.replace(/^tx-/, '');

    const ownership = verifyWorktreeOwnership({
      branch: branchAtEntry,
      callerAgent,
      session,
      allowForeign,
    });

    if (!ownership.ok) {
      fail(0.5, ownership.message, wantJson);
    }

    if (ownership.overrideApplied) {
      writeOwnershipOverrideAuditEntry({ branch: branchAtEntry, sliceId, callerAgent, session });
      if (!wantJson) {
        console.warn(
          `coa-merge: WARN ownership override accepted (COA_OPERATOR+COA_ALLOW_FOREIGN_WORKTREE);` +
            ` session.agent='${session ? session.agent : 'unknown'}', caller='${callerAgent || 'unknown'}'`,
        );
      }
    } else if (!wantJson) {
      log(`[0.5] worktree ownership verified (agent: ${callerAgent || session?.agent})`, wantJson);
    }
  }

  // Step 1: Verify staged files exist
  log('[1/10] Checking staged files...', wantJson);
  const staged = run('git', ['diff', '--cached', '--name-only']);
  const stagedFiles = staged.stdout.split('\n').filter(Boolean);
  if (stagedFiles.length === 0) {
    fail(1, 'No staged files. Stage your changes with git add before running coa-merge.', wantJson);
  }
  log(`  ${stagedFiles.length} file(s) staged`, wantJson);

  // Step 2: git pull --rebase. Skip entirely if no remote is configured —
  // the template-as-template scenario (cloned without a remote, used purely
  // as a starting point) has nothing to pull, and `git pull origin main`
  // emits scary errors that mask the real ceremony state. With a remote we
  // use --autostash so staged files don't trip git's "cannot pull with
  // rebase: Your index contains uncommitted changes" pre-flight check; the
  // ceremony's design depends on staging files before this step runs.
  log('[2/10] Pulling latest trunk...', wantJson);
  if (!dryRun) {
    const remoteCheck = run('git', ['remote']);
    const hasRemote = remoteCheck.ok && shouldAttemptPull(remoteCheck.stdout);
    if (!hasRemote) {
      log('  no remote configured — skipping pull (local-only repo)', wantJson);
    } else {
      const pull = run('git', ['pull', '--rebase', '--autostash', 'origin', 'main']);
      // Tolerate "no tracking" — branch may not yet track an upstream.
      if (!pull.ok && !pull.stderr.includes('no tracking')) {
        fail(2, `git pull --rebase failed: ${pull.stderr}`, wantJson);
      }
      // Restore staged state dropped by --autostash (TPL-250).
      restageAfterAutostash(stagedFiles);
    }
  }

  // -------------------------------------------------------------------
  // Step 2.6: R2 transport-mode — rebase tx-<slice> onto local main.
  //
  // The pull at step 2 only runs when a remote is configured. In a
  // local-only repo (template usage, integration test fixtures), the
  // pull is skipped and our branch could lag behind local main if a
  // sibling worktree committed first. Always rebase in transport mode
  // so step 9c's ff-push has clean fast-forward semantics.
  //
  // Idempotent: a no-op when HEAD already builds on the latest main.
  // -------------------------------------------------------------------
  if (coaMergeMode === 'transport' && !dryRun) {
    log('[2.6/10] Rebasing transport branch onto main...', wantJson);
    // --autostash mirrors the step-2 pull behavior so the operator's
    // already-staged slice files plus any unstaged (e.g. sync-regen
    // output from sibling worktrees) survive the rebase. git restores
    // the stash automatically on success and on benign failure.
    const rebase = run('git', ['rebase', '--autostash', 'main']);
    if (!rebase.ok) {
      // Abort the rebase if it left us mid-conflict — leaving the
      // worktree in an in-progress state breaks coa-merge's atomic
      // contract. The operator must rerun after resolving externally.
      run('git', ['rebase', '--abort']);
      fail(
        2.6,
        [
          'git rebase main failed (conflict or other).',
          rebase.stderr,
          '',
          'Resolve the conflict in a separate session, then rerun coa-merge.',
        ].join('\n'),
        wantJson,
      );
    }
    // Restore staged state dropped by --autostash (TPL-250).
    restageAfterAutostash(stagedFiles);
  }

  // ---------------------------------------------------------------------
  // Step 2.5: Auto-extend caller's active claim (TPL-222 J5)
  //
  // The caller's claim, filed via `--acquire`, covers user files. The
  // ceremony will also stage VERSION/package.json/CHANGELOG.md (steps
  // 7) and pre-commit Phase 5 will regenerate AGENTS.md, .cursorrules,
  // LOCAL.md, MICRO.md, docs/_generated/* and re-stage them. Phase-3
  // enforcement runs *inside* pre-commit and would flag those as
  // protected files lacking a claim. Auto-extend pre-empts that by
  // adding the ceremony+regen paths to the caller's claim before
  // enforcement (step 3) runs.
  // ---------------------------------------------------------------------
  log('[2.5/10] Auto-extending caller claim with ceremony + regen paths...', wantJson);
  const callerAgentForPick = resolveCallerAgent(args);
  const sliceForPick = coaMergeMode === 'transport' ? branchAtEntry.replace(/^tx-/, '') : null;
  const claimIdOverride = args.get('--claim-id') || null;
  const pickResult = findCallerActiveClaim(stagedFiles, {
    callerAgent: callerAgentForPick,
    slice: sliceForPick,
    claimIdOverride,
  });
  if (!pickResult.ok) {
    if (pickResult.reason === 'ambiguous') {
      const ids = (pickResult.candidates || [])
        .map((c) => `  - ${c.id}  agent=${c.agent || '?'}  slice=${c.slice || '?'}`)
        .join('\n');
      fail(
        2.5,
        [
          'Multiple active claims tie on agent, slice, target overlap, and created time.',
          '',
          'Tiered scoring (agent > slice > target overlap > recency) could not pick a',
          'unique winner. Pass --claim-id=<id> to force a specific claim, or expire',
          'the stale claim with `claim-check --force-expire --id=<id>`.',
          '',
          'Candidates:',
          ids,
        ].join('\n'),
        wantJson,
      );
    }
    if (pickResult.reason === 'override-not-found') {
      fail(
        2.5,
        [
          `--claim-id=${claimIdOverride} did not match any active claim.`,
          '',
          'Drop the override or pass an active claim id. Inspect with:',
          '  node scripts/checks/claim-check.mjs --audit',
        ].join('\n'),
        wantJson,
      );
    }
    fail(
      2.5,
      [
        'No active claim found that covers your staged files.',
        '',
        'Your slice needs a claim filed via:',
        '  node scripts/checks/claim-check.mjs --acquire \\',
        '    --agent=<your-agent> --slice=<id> \\',
        '    --targets=<comma-list-of-user-files> --action=modify',
        '',
        'coa-merge will then auto-extend that claim with VERSION, package.json,',
        'CHANGELOG.md and the regen paths Phase-5 will rewrite.',
      ].join('\n'),
      wantJson,
    );
  }
  const callerClaim = pickResult.claim;
  if (!dryRun) {
    const addPaths = resolveAutoExtendPaths({ filesUserStaged: stagedFiles });
    const extendCmd = [
      CLAIM_CHECK_SCRIPT,
      '--extend',
      `--id=${callerClaim.id}`,
      `--agent=${callerClaim.agent}`,
      `--add-targets=${addPaths.join(',')}`,
      '--action=modify',
    ];
    const extend = run('node', extendCmd);
    if (!extend.ok) {
      fail(2.5, `claim --extend failed: ${extend.stdout}\n${extend.stderr}`, wantJson);
    }
    log(
      `  extended claim ${callerClaim.id} (+${addPaths.length} ceremony/regen path(s))`,
      wantJson,
    );
  } else {
    log(`  (dry-run) would extend claim ${callerClaim.id}`, wantJson);
  }

  // Step 3: Enforce claims
  log('[3/10] Checking claims...', wantJson);
  if (!dryRun) {
    const claims = run('node', [CLAIM_CHECK_SCRIPT, '--enforce', '--staged']);
    if (!claims.ok) {
      fail(3, `Claim enforcement failed:\n${claims.stdout}\n${claims.stderr}`, wantJson);
    }
  }

  // ---------------------------------------------------------------------
  // Steps 4-6: in-memory only (TPL-222 J1 deferred mutation)
  //
  // The previous flow wrote VERSION + package.json at step 5 and called
  // changelog-release at step 6, leaving disk in a half-mutated state if
  // step 8 commit later failed. New flow computes everything in memory
  // and only writes immediately before staging at step 7. Mutation is
  // contiguous and bounded so rollback (step 8 failure → restore from
  // HEAD) is deterministic.
  // ---------------------------------------------------------------------

  // Step 4: Read HEAD VERSION, compute next (no disk writes)
  log('[4/10] Computing next version...', wantJson);
  const headVersion = headVersionAtEntry || '0.0.0';
  const nextVersion = bumpPatch(headVersion);
  log(`  ${headVersion} -> ${nextVersion}`, wantJson);

  // Step 5: Validate CHANGELOG content (no disk writes)
  log('[5/10] Validating CHANGELOG...', wantJson);
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  const changelog = changelogAtEntry || readFileSync(changelogPath, 'utf8');
  if (!changelogHasContent(changelog)) {
    fail(
      5,
      'CHANGELOG [Unreleased] has no content. Add changelog entries before merging.',
      wantJson,
    );
  }
  if (changelog.includes(`## [${nextVersion}]`)) {
    fail(
      5,
      `CHANGELOG.md already contains [${nextVersion}] section. ` +
        'A previous run may have partially completed — investigate before re-running.',
      wantJson,
    );
  }

  // Step 6: Compose next-version content in memory (no disk writes)
  log('[6/10] Composing next CHANGELOG body in memory...', wantJson);
  const pkgPath = join(ROOT, 'package.json');
  const pkgRaw = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  pkg.version = nextVersion;
  const nextPackageText = JSON.stringify(pkg, null, 2) + '\n';

  const { before, unreleased, after } = extractUnreleased(changelog);
  const releaseTs = formatReleaseTimestamp(new Date());
  const nextChangelogText = composeReleasedChangelog({
    before,
    unreleased,
    after,
    version: nextVersion,
    timestamp: releaseTs,
  });
  const nextVersionFileText = nextVersion + '\n';

  // ---------------------------------------------------------------------
  // Steps 7-8: atomic write+stage+commit with rollback (TPL-222 J1)
  //
  // The contract: between the start of step 7 and the end of step 8, no
  // intermediate failure may leave VERSION/package.json/CHANGELOG.md
  // mutated on disk without an accompanying commit. If commit fails we
  // restore the three files from HEAD content (`git show HEAD:<path>`),
  // unstage them, emit a half-baked-state marker for telemetry, and
  // exit non-zero with the original step number.
  // ---------------------------------------------------------------------

  // Step 6.5 (transport-mode only): write the R2 / ADR-0017 ceremony
  // marker BEFORE staging ceremony files so pre-commit phase 2.7 sees a
  // valid lock at the moment it inspects the staged set. Capture
  // mainShaAtEntry now so step 9c can use --force-with-lease against
  // exactly the main we rebased onto.
  let mainShaAtEntry = null;
  if (coaMergeMode === 'transport' && !dryRun) {
    log('[6.5/10] Writing R2 merge marker...', wantJson);
    const mainProbe = run('git', ['rev-parse', 'main']);
    if (!mainProbe.ok) {
      fail(6.5, `cannot resolve main SHA: ${mainProbe.stderr}`, wantJson);
    }
    mainShaAtEntry = mainProbe.stdout.trim();
    try {
      writeMergingMarker(ROOT, branchAtEntry);
      markerWritten = true;
      log(
        `  marker written for ${branchAtEntry} (mainSha=${mainShaAtEntry.slice(0, 8)})`,
        wantJson,
      );
    } catch (err) {
      fail(6.5, `failed to write merge marker: ${err.message}`, wantJson);
    }
  }

  // Step 7: write the three files + git add (the only mutation block).
  // Capture pre-mutation contents first so rollback can restore the
  // operator's pre-staged CHANGELOG [Unreleased] edits if step 8 fails.
  log('[7/10] Writing + staging version files...', wantJson);
  const ceremonyFiles = ['VERSION', 'package.json', 'CHANGELOG.md'];
  const preMutationSnapshot = dryRun ? null : snapshotCeremonyFiles(ceremonyFiles);
  if (!dryRun) {
    writeFileSync(join(ROOT, 'VERSION'), nextVersionFileText, 'utf8');
    writeFileSync(pkgPath, nextPackageText, 'utf8');
    writeFileSync(changelogPath, nextChangelogText, 'utf8');
    run('git', ['add', 'VERSION', 'package.json', 'CHANGELOG.md']);
    log(
      `  VERSION + package.json bumped to ${nextVersion}; CHANGELOG [${nextVersion}] composed`,
      wantJson,
    );
  }

  // Step 8: Commit (pre-commit hook runs all phases). On failure, roll
  // back the three ceremony files using the pre-mutation snapshot so the
  // operator's pre-staged edits are preserved, and emit a
  // half-baked-state marker (J4).
  log('[8/10] Committing...', wantJson);
  if (!dryRun) {
    const commit = run('git', ['commit', '-m', commitMessage], { stdio: 'inherit' });
    if (!commit.ok && commit.status !== null) {
      const rollback = rollbackCeremonyFiles(ceremonyFiles, preMutationSnapshot);
      emitHalfBakedMarker({
        stepFailed: 8,
        headVersion,
        workingTreeVersion: nextVersion,
        changelogReleased: true,
        claimId: callerClaim?.id || null,
        agent: callerClaim?.agent || null,
      });
      // Remove the R2 marker so the next coa-merge run starts clean.
      // Pre-commit refusal is a signal the ceremony cannot proceed; the
      // marker should not outlive a failed attempt.
      cleanupMarker();
      const rollbackNote = rollback.ok
        ? 'Rolled back VERSION/package.json/CHANGELOG.md to pre-mutation state; re-run coa-merge once the issue is fixed.'
        : `Rollback PARTIALLY FAILED — ${rollback.failures.length} file(s) may be stuck mid-mutation. Manual recovery: git restore VERSION CHANGELOG.md package.json`;
      fail(8, `git commit failed (pre-commit hook may have blocked). ${rollbackNote}`, wantJson);
    }
  }

  // Step 9: Auto-complete claims — use caller self-identification (TPL-254).
  // Staging area is empty post-commit, so --staged alone cannot resolve the
  // agent. Pass --agent=<callerClaim.agent> explicitly (self-identification)
  // and --commit-hash=<HEAD> so verifyClaimWorkCommitted uses the just-landed
  // commit instead of the empty staging set. The operator's git user.name is
  // irrelevant — the trust signal is the claim the operator acquired.
  log('[9/10] Completing claims...', wantJson);
  if (!dryRun) {
    const headCommit = run('git', ['rev-parse', 'HEAD']);
    const headHash = headCommit.ok ? headCommit.stdout.trim() : null;
    const autoCompleteArgs = [
      CLAIM_CHECK_SCRIPT,
      '--auto-complete',
      `--agent=${callerClaim.agent}`,
    ];
    if (headHash) {
      autoCompleteArgs.push(`--commit-hash=${headHash}`);
    } else {
      autoCompleteArgs.push('--staged');
    }
    run('node', autoCompleteArgs);
  }

  // -------------------------------------------------------------------
  // Step 9c: R2 transport-mode — ff-update local main, repo-shape-aware
  // (F12 / TPL-237 patch).
  //
  // Original R2 used `git update-ref refs/heads/main HEAD <oldSha>` for
  // every transport-mode commit. That advances the trunk ref but does
  // NOT touch any other worktree's working tree, leaving an operator-
  // visible desync when main is checked out elsewhere — the F12
  // incident shape (90 files differed, 16 R2 implementation files
  // missing from the main worktree even though they existed in HEAD).
  //
  // F12 routes by repo shape:
  //   - bare repo                  → keep `update-ref` (no working
  //                                   tree to sync)
  //   - main not checked out       → keep `update-ref` + stderr
  //                                   warning
  //   - main checked out elsewhere → use `git push --force-with-lease`
  //                                   targeting the main worktree path
  //                                   with `receive.denyCurrentBranch=
  //                                   updateInstead` set on that repo
  //   - main checked out elsewhere → REFUSE with operator-actionable
  //     but config not set            command pointing at the one-time
  //                                   `receive.denyCurrentBranch=
  //                                   updateInstead` setup. Auto-config
  //                                   is intentionally NOT the default
  //                                   so we don't silently mutate the
  //                                   target repo's config.
  //
  // Branch deletion of tx-<slice> is intentionally NOT done here:
  //   1. We're checked out on the branch from this worktree.
  //   2. R4's --teardown-stale already handles cleanup of merged
  //      transport branches, with operator-gated --execute.
  // -------------------------------------------------------------------
  if (coaMergeMode === 'transport' && !dryRun) {
    log('[9c/10] Fast-forward merging tx-branch into main (F12 repo-shape-aware)...', wantJson);
    if (!mainShaAtEntry) {
      cleanupMarker();
      fail(9.3, 'mainShaAtEntry unavailable — cannot perform safe ff-update', wantJson);
    }
    const headProbe = run('git', ['rev-parse', 'HEAD']);
    if (!headProbe.ok) {
      cleanupMarker();
      fail(9.3, `cannot resolve HEAD after commit: ${headProbe.stderr}`, wantJson);
    }
    const headSha = headProbe.stdout.trim();

    // TPL-328: ancestry guard — re-read main immediately before ff-update.
    // mainShaAtEntry captured at Step 6.5 may be stale if a sibling worktree
    // committed between Step 6.5 and now.
    const preStep9cMainProbe = run('git', ['rev-parse', 'refs/heads/main']);
    const preStep9cMain = preStep9cMainProbe.ok ? preStep9cMainProbe.stdout.trim() : null;
    if (preStep9cMain && preStep9cMain !== mainShaAtEntry) {
      const descentCheck = run('git', ['merge-base', '--is-ancestor', preStep9cMain, headSha]);
      if (!descentCheck.ok) {
        cleanupMarker();
        fail(
          9.3,
          [
            `main advanced to ${preStep9cMain.slice(0, 8)} during ceremony;`,
            `HEAD ${headSha.slice(0, 8)} is not its descendant.`,
            `Recovery: git rebase main, then rerun coa-merge.`,
          ].join('\n'),
          wantJson,
        );
      }
      mainShaAtEntry = preStep9cMain; // update CAS base to match new reality
    }
    // Belt-and-suspenders: HEAD must descend from mainShaAtEntry regardless.
    const entryDescentCheck = run('git', ['merge-base', '--is-ancestor', mainShaAtEntry, headSha]);
    if (!entryDescentCheck.ok) {
      cleanupMarker();
      fail(
        9.3,
        [
          `HEAD ${headSha.slice(0, 8)} is not a descendant of main at step-6.5`,
          `(${mainShaAtEntry.slice(0, 8)}). Step 2.6 may have missed a concurrent commit.`,
          `Recovery: git rebase main, then rerun coa-merge.`,
        ].join('\n'),
        wantJson,
      );
    }

    // Detect repo shape:
    //   - core.bare cross-checked with rev-parse --is-bare-repository
    //     so a tampered config (one true, one false) falls through to
    //     the safer non-bare path
    //   - parse `git worktree list --porcelain` to find a main worktree
    //   - read the destination worktree's receive.denyCurrentBranch
    const coreBareProbe = run('git', ['config', '--get', 'core.bare']);
    const isBareProbe = run('git', ['rev-parse', '--is-bare-repository']);
    const coreBare = (coreBareProbe.stdout || '').trim() === 'true';
    const isBareRepo = (isBareProbe.stdout || '').trim() === 'true';
    const isBare = coreBare && isBareRepo;

    const wtListProbe = run('git', ['worktree', 'list', '--porcelain']);
    const mainWt = wtListProbe.ok ? findMainWorktree(wtListProbe.stdout) : null;

    let denyValue = null;
    if (mainWt) {
      const denyProbe = run('git', [
        '-C',
        mainWt.path,
        'config',
        '--get',
        'receive.denyCurrentBranch',
      ]);
      // git config exits 1 when key unset; treat empty/missing as null.
      denyValue = denyProbe.ok ? (denyProbe.stdout || '').trim() : null;
    }

    const method = classifyFfUpdateMethod({
      isBare,
      mainWorktree: mainWt,
      denyCurrentBranchValue: denyValue,
    });

    if (method === FF_UPDATE_METHODS.REFUSE_NEEDS_CONFIG) {
      cleanupMarker();
      fail(9.3, composeUpdateInsteadSetupHint(mainWt?.path), wantJson);
    }

    if (method === FF_UPDATE_METHODS.PUSH_UPDATE_INSTEAD) {
      // TPL-265: validate we're running from a tx-* transport worktree before
      // touching the target repo's config. Belt-and-suspenders: coaMergeMode
      // already verified this, but explicit validation here prevents mutation
      // if invoked with a wrong branch in an unusual code path.
      try {
        validatePushUpdateInsteadWorktree(branchAtEntry);
      } catch (validationErr) {
        cleanupMarker();
        fail(9.3, validationErr.message, wantJson);
      }

      // TPL-265: snapshot target's .git/config before any mutation so we can
      // restore on push failure. Warn (not fail) when capture fails so an
      // unreadable config file doesn't block an otherwise-valid ceremony.
      let capturedGitConfig = null;
      try {
        capturedGitConfig = captureGitConfig(mainWt.path);
      } catch (captureErr) {
        console.error(
          `coa-merge: WARN could not capture ${mainWt.path}/.git/config for rollback: ${captureErr.message}`,
        );
      }

      // git push --force-with-lease=main:<oldSha> <main-worktree-path>
      //   HEAD:refs/heads/main
      //
      // updateInstead makes git atomically advance the trunk ref AND
      // sync the main worktree's tracked files; built-in safety
      // refuses on a dirty working tree. force-with-lease retains the
      // CAS-against-inter-session-movement guarantee from R2 baseline.
      const push = run('git', [
        'push',
        `--force-with-lease=refs/heads/main:${mainShaAtEntry}`,
        mainWt.path,
        'HEAD:refs/heads/main',
      ]);
      let step9cSyncMethod = 'updateInstead';
      if (!push.ok) {
        // TPL-265: restore target .git/config to pre-Step-9c state on error.
        if (capturedGitConfig !== null) {
          try {
            restoreGitConfig(mainWt.path, capturedGitConfig);
            console.error(
              `coa-merge: Step 9c failed; restored ${mainWt.path}/.git/config to pre-push state`,
            );
          } catch (restoreErr) {
            console.error(
              `coa-merge: WARN could not restore ${mainWt.path}/.git/config: ${restoreErr.message}`,
            );
          }
        }
        // updateInstead refusal text mentions "dirty working directory"
        // when the destination has uncommitted changes.
        const stderr = push.stderr || '';
        const dirty = /unstaged changes|uncommitted changes|working directory/i.test(stderr);
        if (dirty) {
          // TPL-273: dirty main wt causes updateInstead to refuse. Fall back to
          // update-ref (with optimistic locking on old SHA) + checkout HEAD -- .
          // to bypass the dirty-tree check. Uncommitted drift in main's wt
          // (header stamps, generated indexes) is intentionally discarded by the
          // checkout — it is operational dust in a non-bare repo convention.
          console.error(
            `coa-merge: Step 9c push refused (dirty main wt); falling back to update-ref + checkout HEAD -- (TPL-273)`,
          );
          const refUpdate = run('git', ['update-ref', 'refs/heads/main', headSha, mainShaAtEntry]);
          if (!refUpdate.ok) {
            cleanupMarker();
            fail(9.3, `ff-update via update-ref failed: ${refUpdate.stderr}`, wantJson);
          }
          const checkout = run('git', ['checkout', 'HEAD', '--', '.'], { cwd: mainWt.path });
          if (!checkout.ok) {
            cleanupMarker();
            fail(
              9.3,
              `checkout HEAD -- after dirty-wt update-ref failed: ${checkout.stderr}`,
              wantJson,
            );
          }
          step9cSyncMethod = 'update-ref+checkout';
        } else {
          cleanupMarker();
          fail(
            9.3,
            [
              'ff-update push to main worktree failed.',
              push.stderr,
              '',
              'Recovery:',
              '  1. cd into the worktree and run: git rebase main',
              '  2. Resolve any conflicts',
              '  3. Rerun coa-merge to re-do the ceremony on top of the new main',
            ].join('\n'),
            wantJson,
          );
        }
      }
      log(
        step9cSyncMethod === 'update-ref+checkout'
          ? `  ff-updated main → ${headSha.slice(0, 8)} (was ${mainShaAtEntry.slice(0, 8)}); main wt ${mainWt.path} synced via update-ref+checkout (dirty-wt fallback, TPL-273)`
          : `  ff-updated main → ${headSha.slice(0, 8)} (was ${mainShaAtEntry.slice(0, 8)}); main worktree at ${mainWt.path} synced via updateInstead`,
        wantJson,
      );
    } else {
      // UPDATE_REF_BARE or UPDATE_REF_NO_MAIN → fall back to update-ref.
      // Preserves R2 baseline behaviour for bare repos (Zvenix shape).
      const update = run('git', ['update-ref', 'refs/heads/main', headSha, mainShaAtEntry]);
      if (!update.ok) {
        cleanupMarker();
        fail(
          9.3,
          [
            'ff-update of main failed (main moved during ceremony, or other git error).',
            update.stderr,
            '',
            'Recovery:',
            '  1. cd into the worktree and run: git rebase main',
            '  2. Resolve any conflicts',
            '  3. Rerun coa-merge to re-do the ceremony commit on top of the new main',
          ].join('\n'),
          wantJson,
        );
      }
      if (method === FF_UPDATE_METHODS.UPDATE_REF_NO_MAIN) {
        // Stderr-only warning: ref advanced fine, but no main worktree
        // means an operator on the orphan setup should manually verify.
        // Skip the warning when --json so structured output stays clean.
        if (!wantJson) {
          console.error(
            `coa-merge: WARN no main worktree detected; ref advanced via update-ref but no working tree was synced. Verify state if you have a checkout of main elsewhere.`,
          );
        }
      }
      log(
        `  ff-updated main → ${headSha.slice(0, 8)} (was ${mainShaAtEntry.slice(0, 8)}) via update-ref (${method})`,
        wantJson,
      );
    }

    cleanupMarker();
    log(`  R2 marker removed; branch ${branchAtEntry} now eligible for --teardown-stale`, wantJson);
  }

  // Step 9b: Write snapshot + zip backup to .backups/ unless skipped.
  // Restored after a 30-version regression (0.6.10 → 0.7.19 had no
  // safety net) discovered in field reports B1 (ai-cockpit) and Z4
  // (Zvenix v0.11.134 drain). Uses mergezip with --no-bump (commit
  // already happened) and --skip-tests (pre-commit ran them) so the
  // step writes both .txt and .zip without re-running heavy gates.
  // Failure is non-fatal — commit succeeded; the artefact is a safety
  // net, not a gate. (TPL-217)
  if (shouldWriteSnapshot({ noSnapshot: wantNoSnapshot, dryRun })) {
    log('[9b/10] Writing snapshot + zip to .backups/...', wantJson);
    const snapshot = run('node', [MERGEZIP_SCRIPT, '--no-bump', '--skip-tests', '--quiet']);
    if (!snapshot.ok) {
      log(
        `  WARN: snapshot failed (commit succeeded; safety net not written): ${snapshot.stderr}`,
        wantJson,
      );
    }
  } else if (wantNoSnapshot) {
    log('[9b/10] Snapshot skipped (--no-snapshot)', wantJson);
  }

  // Step 9b.5: In transport mode, propagate .backups/ artifacts from the
  // transport worktree into the main repo so they survive teardown. (TPL-270)
  // Without this step, artifacts land in the transport worktree's .backups/,
  // are destroyed on --teardown-stale, and R8.1 pre-push flags the missing
  // snapshot on the next push. Non-fatal — same policy as step 9b.
  // Note: step 9c runs BEFORE step 9b, so PUSH_UPDATE_INSTEAD failure exits
  // before this step — no orphan cleanup needed on push failure.
  if (
    coaMergeMode === 'transport' &&
    !dryRun &&
    shouldWriteSnapshot({ noSnapshot: wantNoSnapshot, dryRun })
  ) {
    log('[9b.5/10] Propagating .backups/ artifacts to main repo...', wantJson);
    const wtListResult = run('git', ['worktree', 'list', '--porcelain']);
    const propagateMainWt = wtListResult.ok ? findMainWorktree(wtListResult.stdout) : null;
    if (!propagateMainWt) {
      log('  WARN: no main worktree found; .backups/ propagation skipped', wantJson);
    } else {
      const bareCheck = run('git', [
        '-C',
        propagateMainWt.path,
        'rev-parse',
        '--is-bare-repository',
      ]);
      const isBareMain = (bareCheck.stdout || '').trim() === 'true';
      if (isBareMain) {
        log(
          `  WARN: main repo at ${propagateMainWt.path} is bare; .backups/ propagation skipped (run pnpm mergezip:no-bump from main manually)`,
          wantJson,
        );
      } else {
        const result = propagateBackupsToMainRepo({
          localRoot: ROOT,
          mainWorktreePath: propagateMainWt.path,
          version: nextVersion,
        });
        if (result.ok) {
          log(
            `  propagated ${result.copied.length} artifact(s) to ${propagateMainWt.path}/.backups/: ${result.copied.join(', ')}`,
            wantJson,
          );
        } else {
          log(`  WARN: .backups/ propagation incomplete: ${result.message}`, wantJson);
        }
      }
    }
  }

  // Step 9b.6: In transport mode, propagate session-summary .md files from
  // the transport worktree into the main repo so they survive teardown. (TPL-271)
  // A Sonnet writing its summary to the transport-relative path loses it on
  // --teardown-stale unless this step copies it first. Non-fatal — same policy
  // as step 9b and 9b.5.
  if (coaMergeMode === 'transport' && !dryRun) {
    log('[9b.6/10] Propagating session-summary files to main repo...', wantJson);
    const wtListResult96 = run('git', ['worktree', 'list', '--porcelain']);
    const propagateMainWt96 = wtListResult96.ok ? findMainWorktree(wtListResult96.stdout) : null;
    if (!propagateMainWt96) {
      log('  WARN: no main worktree found; session-summaries propagation skipped', wantJson);
    } else {
      const bareCheck96 = run('git', [
        '-C',
        propagateMainWt96.path,
        'rev-parse',
        '--is-bare-repository',
      ]);
      const isBareMain96 = (bareCheck96.stdout || '').trim() === 'true';
      if (isBareMain96) {
        log(
          `  WARN: main repo at ${propagateMainWt96.path} is bare; session-summaries propagation skipped`,
          wantJson,
        );
      } else {
        const result96 = propagateSummariesToMainRepo({
          localRoot: ROOT,
          mainWorktreePath: propagateMainWt96.path,
        });
        if (result96.copied.length > 0) {
          log(
            `  propagated ${result96.copied.length} summary file(s) to ${propagateMainWt96.path}/docs/analysis/session-summaries/: ${result96.copied.join(', ')}`,
            wantJson,
          );
        }
        const differs = result96.skipped.filter((s) => s.reason === 'differs');
        for (const { file } of differs) {
          log(
            `  WARN: session-summary ${file} already exists in main with different content; skipped (resolve manually)`,
            wantJson,
          );
        }
        if (result96.message) {
          log(`  ${result96.message}`, wantJson);
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // Step 9e (transport-mode only): auto-teardown provably-merged tx-*
  // branches. Strict `--is-ancestor` check eliminates any false-positive
  // risk; branch deletion uses `-d` (not `-D`) so git itself refuses
  // unmerged work. No COA_OPERATOR gate needed — zero-information-loss
  // logic. (TPL-283 / W1 / ADR-0021)
  //
  // branchAtEntry is excluded — the caller is still checked out on it;
  // its teardown happens via coa-worktree --teardown after this script
  // exits.
  // -------------------------------------------------------------------
  if (coaMergeMode === 'transport' && !dryRun) {
    log('[9e/10] Auto-teardown provably-merged tx-* branches...', wantJson);
    const allBranchResult = run('git', [
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/heads/tx-*',
    ]);
    const allTxBranches = allBranchResult.ok
      ? allBranchResult.stdout.split('\n').filter(Boolean)
      : [];

    const { merged, unmerged } = classifyTxBranchesForTeardown({
      allTxBranches,
      currentBranch: branchAtEntry,
      isAncestorOfMain: (b) => run('git', ['merge-base', '--is-ancestor', b, 'main']).status === 0,
    });

    if (unmerged.length > 0) {
      for (const b of unmerged) {
        log(`  [9e] skipped (unmerged commits): ${b}`, wantJson);
      }
    }

    const tornDown = [];
    for (const txBranch of merged) {
      // Find associated worktree (if any) before attempting branch deletion.
      const wtListResult = run('git', ['worktree', 'list', '--porcelain']);
      const wtPath = wtListResult.ok ? findWorktreeForBranch(wtListResult.stdout, txBranch) : null;

      if (wtPath) {
        const removeResult = run('git', ['worktree', 'remove', wtPath]);
        if (!removeResult.ok) {
          // Dirty worktree — preserve both worktree and branch; operator
          // must resolve before the next teardown opportunity. (case 4)
          log(
            `  [9e] WARN: ${txBranch}: worktree-remove ${wtPath} failed (dirty?); preserved`,
            wantJson,
          );
          continue;
        }
      }

      // Delete the branch with -d (not -D) — git refuses unmerged work.
      const deleteResult = run('git', ['branch', '-d', txBranch]);
      if (!deleteResult.ok) {
        log(`  [9e] WARN: ${txBranch}: branch -d failed: ${deleteResult.stderr}`, wantJson);
      } else {
        tornDown.push(txBranch);
      }
    }

    if (tornDown.length > 0) {
      log(
        `  [9e] auto-teardown: removed ${tornDown.length} merged tx- branch(es): ${tornDown.join(', ')}`,
        wantJson,
      );
    } else {
      log(`  [9e] no merged tx-* branches torn down`, wantJson);
    }
  }

  // -------------------------------------------------------------------
  // Step 9f (transport-mode only): auto-expire stale claims. Runs the
  // same --auto-expire already called in pre-commit Phase 3, but also
  // catches any claims that expired during the ceremony window.
  // Non-fatal — claim expiry is housekeeping; never blocks. (TPL-283)
  // -------------------------------------------------------------------
  if (coaMergeMode === 'transport' && !dryRun) {
    log('[9f/10] Auto-expiring stale claims...', wantJson);
    const expireResult = run('node', [CLAIM_CHECK_SCRIPT, '--auto-expire']);
    if (!expireResult.ok) {
      log(
        `  WARN: claim-check --auto-expire failed: ${expireResult.stderr || expireResult.stdout}`,
        wantJson,
      );
    } else {
      const msg = (expireResult.stdout || '').trim();
      if (msg) log(`  ${msg}`, wantJson);
    }
  }

  // Step 10: Optionally push
  if (wantPush) {
    log('[10/10] Pushing...', wantJson);
    if (!dryRun) {
      const push = run('git', ['push', 'origin', 'main']);
      if (!push.ok) {
        fail(
          10,
          `git push failed: ${push.stderr}. Try git pull --rebase and run coa-merge again.`,
          wantJson,
        );
      }
    }
  } else {
    log('[10/10] Push skipped (use --push to enable)', wantJson);
  }

  // Success
  if (wantJson) {
    console.log(
      JSON.stringify({
        ok: true,
        version: nextVersion,
        stagedFiles: stagedFiles.length,
        pushed: wantPush && !dryRun,
        dryRun,
      }),
    );
  } else {
    console.log(`\ncoa-merge: SUCCESS — committed as v${nextVersion}`);
    if (dryRun) console.log('  (dry-run mode — no changes were made)');
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('coa-merge.mjs') || process.argv[1].endsWith('coa-merge'));

if (isDirectRun) {
  main();
}
