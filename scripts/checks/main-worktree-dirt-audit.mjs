/* @HEADER
 * @version 0.7.91 | 2026-05-05
 * @purpose W1 hygiene — warn when main worktree contains untracked files in tracked dirs (residue from tx-* sessions).
 * @sidecar main-worktree-dirt-audit.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * W1 — Main-worktree dirt audit (warn-only).
 *
 * Detects untracked files in key directories (tests/, apps/, modules/,
 * scripts/, docs/) that may be residue left by a tx-* session that
 * accidentally edited in the main worktree instead of its transport
 * worktree. Fires from pre-commit Phase 0.5; always exits 0.
 *
 * Modes:
 *   --self-test  — run known-good/known-bad path fixtures through the
 *                  pure helpers; exit 0 on all pass, exit 1 on any fail.
 *   --warn-only  — (default) enumerate untracked dirt, emit warnings to
 *                  stderr, always exit 0.
 *
 * When running from a tx-* transport worktree, exits 0 silently —
 * dirt in a transport worktree is expected working state, not residue.
 *
 * @see docs/adr/0021-auto-teardown-and-dirt-audit.md
 * @see docs/rules-registry.md (W1 entry)
 */

import { spawnSync } from 'node:child_process';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Pure logic — exported for unit testing
// ---------------------------------------------------------------------------

/**
 * Returns true when the worktree path is a tx-* transport worktree.
 * Mirrors the same regex used by main-worktree-guard.mjs so the two
 * scripts stay in sync on the transport-worktree definition.
 */
export function isTransportWorktreePath(worktreePath) {
  const name = basename(String(worktreePath));
  return /-tx-[A-Z]/.test(name);
}

/**
 * Known-OK patterns for untracked paths — these are expected residue
 * that should not trigger a warning.
 *
 *   .claims/clm-*.json  — active/recent claim files written by claim-check
 *   node_modules/       — package install output (usually gitignored, but
 *                          listed here for defence-in-depth)
 *   .backups/           — snapshot archives (gitignored)
 *   _generated/         — generated index/spec files (gitignored)
 */
const KNOWN_OK_PATTERNS = [
  /^\.claims\/clm-[^/\\]+\.json$/,
  /node_modules[/\\]/,
  /^\.backups[/\\]/,
  /_generated[/\\]/,
];

/**
 * Directories whose untracked files we report on.
 * Files outside these dirs are silently ignored (too broad to warn on).
 */
const WATCHED_DIRS = ['tests/', 'apps/', 'modules/', 'scripts/', 'docs/'];

/**
 * Returns true when the given file path is a known-OK untracked path
 * that should not trigger a W1 warning.
 */
export function isKnownOk(filePath) {
  const f = String(filePath).replace(/\\/g, '/');
  return KNOWN_OK_PATTERNS.some((pat) => pat.test(f));
}

/**
 * Returns true when the file path is inside one of the watched dirs.
 */
export function isInWatchedDir(filePath) {
  const f = String(filePath).replace(/\\/g, '/');
  return WATCHED_DIRS.some((dir) => f.startsWith(dir));
}

/**
 * Given lines from `git status --porcelain`, return the list of
 * untracked file paths that are in a watched dir AND are not known-OK.
 *
 * `git status --porcelain --untracked-files=normal` already excludes
 * gitignored files, so we only need to strip known-OK paths on top.
 */
export function filterUntrackedFiles(statusLines) {
  return statusLines
    .filter((line) => line.startsWith('?? '))
    .map((line) => line.slice(3).trim())
    .filter((f) => isInWatchedDir(f))
    .filter((f) => !isKnownOk(f));
}

// ---------------------------------------------------------------------------
// Self-test mode
// ---------------------------------------------------------------------------

const SELF_TEST_CASES = [
  // isTransportWorktreePath
  { fn: 'isTransportWorktreePath', input: '/repos/contextrail-template', expected: false },
  {
    fn: 'isTransportWorktreePath',
    input: '/repos/contextrail-template-tx-TPL-283',
    expected: true,
  },
  { fn: 'isTransportWorktreePath', input: 'C:\\Projects\\ctx-tx-AIC-DEV-099', expected: true },
  { fn: 'isTransportWorktreePath', input: '/repos/my-tx-project', expected: false },

  // isKnownOk
  { fn: 'isKnownOk', input: '.claims/clm-abc123.json', expected: true },
  { fn: 'isKnownOk', input: '.claims/config.json', expected: false },
  { fn: 'isKnownOk', input: 'scripts/checks/foo.mjs', expected: false },
  { fn: 'isKnownOk', input: 'tests/_generated/foo.mjs', expected: true },
  { fn: 'isKnownOk', input: '.backups/snap.zip', expected: true },

  // isInWatchedDir
  { fn: 'isInWatchedDir', input: 'tests/scratch.test.mjs', expected: true },
  { fn: 'isInWatchedDir', input: 'apps/starter/index.html', expected: true },
  { fn: 'isInWatchedDir', input: '.claims/foo.json', expected: false },
  { fn: 'isInWatchedDir', input: 'CHANGELOG.md', expected: false },

  // filterUntrackedFiles
  {
    fn: 'filterUntrackedFiles',
    input: ['?? tests/scratch.test.mjs', '?? .claims/clm-xyz.json', '?? node_modules/foo.mjs'],
    expected: ['tests/scratch.test.mjs'],
  },
  {
    fn: 'filterUntrackedFiles',
    input: ['?? docs/analysis/notes.md', '?? apps/starter/README.md', '??  CHANGELOG.md'],
    expected: ['docs/analysis/notes.md', 'apps/starter/README.md'],
  },
];

function runSelfTest() {
  let allPass = true;
  for (const c of SELF_TEST_CASES) {
    let got;
    if (c.fn === 'isTransportWorktreePath') got = isTransportWorktreePath(c.input);
    else if (c.fn === 'isKnownOk') got = isKnownOk(c.input);
    else if (c.fn === 'isInWatchedDir') got = isInWatchedDir(c.input);
    else if (c.fn === 'filterUntrackedFiles') got = filterUntrackedFiles(c.input);

    const match = JSON.stringify(got) === JSON.stringify(c.expected);
    if (!match) {
      process.stderr.write(
        `[W1 self-test] FAIL: ${c.fn}(${JSON.stringify(c.input)}) → ${JSON.stringify(got)}, expected ${JSON.stringify(c.expected)}\n`,
      );
      allPass = false;
    }
  }
  if (allPass) {
    process.stderr.write(`[W1 self-test] All ${SELF_TEST_CASES.length} cases passed.\n`);
  }
  process.exit(allPass ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Main guard logic
// ---------------------------------------------------------------------------

function getWorktreeRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    cwd: ROOT,
    stdio: 'pipe',
  });
  if (result.status !== 0 || result.error) return null;
  return (result.stdout || '').trim();
}

function getStatusLines(cwd) {
  const result = spawnSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
    encoding: 'utf8',
    cwd,
    stdio: 'pipe',
  });
  if (result.status !== 0 || result.error) return [];
  return (result.stdout || '').split('\n').filter(Boolean);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const worktreeRoot = getWorktreeRoot();

  // Not in a git repo — nothing to audit.
  if (!worktreeRoot) {
    process.exit(0);
    return;
  }

  // Transport worktree — dirt here is expected working state, not residue.
  if (isTransportWorktreePath(worktreeRoot)) {
    process.exit(0);
    return;
  }

  // Main worktree — check for dirt in watched dirs.
  const statusLines = getStatusLines(worktreeRoot);
  const suspects = filterUntrackedFiles(statusLines);

  if (suspects.length > 0) {
    process.stderr.write(
      `[W1] main-worktree dirt audit: ${suspects.length} untracked file(s) in tracked dirs:\n`,
    );
    for (const f of suspects) {
      process.stderr.write(`  ${f}\n`);
    }
    process.stderr.write(
      `[W1] These may be residue from a tx-* session that edited in main worktree.\n` +
        `     Options:\n` +
        `       - Commit this work from a tx-* worktree (preferred)\n` +
        `       - Remove stale residue: git clean -fd <path>\n`,
    );
  }

  // Always exit 0 — warn-only (Phase 0.5, W1).
  process.exit(0);
}

main();
