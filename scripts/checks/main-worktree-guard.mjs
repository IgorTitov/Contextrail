/* @HEADER
 * @version 0.8.11 | 2026-05-11
 * @purpose R5 enforcement — block git commit from main worktree; allow only from tx-<slice> transport worktrees or via one-shot rationale file.
 * @sidecar main-worktree-guard.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R5 — Main-worktree guard.
 *
 * Blocks `git commit` when the working directory is the main repo
 * worktree rather than a tx-<slice> transport worktree. Enforces
 * "all feature work travels through coa-worktree + coa-merge" at
 * the git level.
 *
 * Modes:
 *   --self-test  — run known-good/known-bad path fixtures through
 *                  isTransportWorktree(path); exit 0 on all pass,
 *                  exit 1 on any fail.
 *   --json       — emit { ok, worktreeRoot, isTransport }
 *                  to stdout; exit 0/1 based on verdict.
 *   (default)    — human-readable; exit 1 on main-worktree block.
 *
 * Override path: create .coa/r5-override.json with a valid rationale
 * before committing. The file is one-shot: it is consumed and archived
 * immediately on first use. COA_OPERATOR=1 does NOT bypass R5.
 *
 * @see docs/adr/0018-main-worktree-guard.md
 * @see docs/adr/0047-r5-override-rationale-file.md
 * @see docs/guides/r5-override-emergency.md
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consumeOverride } from '../lib/r5-override.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Pure logic — export for unit testing
// ---------------------------------------------------------------------------

/**
 * Returns true when the given worktree path is a transport worktree.
 * Transport worktrees are identified by their basename containing
 * `-tx-` followed immediately by an uppercase letter (e.g. `-tx-TPL-`).
 * This prevents false positives from paths like `/repos/my-tx-project`
 * where `-tx-` is not followed by an uppercase letter.
 */
export function isTransportWorktree(worktreePath) {
  const name = basename(worktreePath);
  return /-tx-[A-Z]/.test(name);
}

// ---------------------------------------------------------------------------
// Self-test mode
// ---------------------------------------------------------------------------

const SELF_TEST_CASES = [
  { path: '/repos/contextrail-template',                 expected: false },
  { path: 'C:\\Projects\\contextrail-template',          expected: false },
  { path: '/repos/contextrail-template-tx-TPL-276',      expected: true  },
  { path: 'C:\\Projects\\contextrail-template-tx-TPL-276', expected: true },
  { path: '/repos/ai-cockpit-tx-AIC-DEV-132',            expected: true  },
  { path: '/repos/zvenix-tx-ZVX-DEV-068',                expected: true  },
  { path: '/repos/my-project',                           expected: false },
  { path: '/repos/my-tx-project',                        expected: false },
];

function runSelfTest() {
  let allPass = true;
  for (const { path, expected } of SELF_TEST_CASES) {
    const got = isTransportWorktree(path);
    const pass = got === expected;
    if (!pass) {
      process.stderr.write(
        `[R5 self-test] FAIL: isTransportWorktree(${JSON.stringify(path)}) → ${got}, expected ${expected}\n`
      );
      allPass = false;
    }
  }
  if (allPass) {
    process.stderr.write(`[R5 self-test] All ${SELF_TEST_CASES.length} cases passed.\n`);
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
  });
  if (result.status !== 0 || result.error) return null;
  return result.stdout.trim();
}

function getStagedFiles(worktreeRoot) {
  const result = spawnSync('git', ['diff', '--cached', '--name-only'], {
    encoding: 'utf8',
    cwd: worktreeRoot,
  });
  if (result.status !== 0 || result.error) return [];
  return result.stdout.trim().split('\n').filter(Boolean);
}

function buildRefusalMessage(overrideReason) {
  const agentRole = process.env.COA_AGENT || '<your-role>';
  const lines = [
    `[R5] Direct commit to main worktree is forbidden.`,
    ``,
    `     Use transport ceremony:`,
    ``,
    `       git stash --include-untracked`,
    `       node scripts/coa-worktree.mjs --create --agent=${agentRole}`,
    `       cd ../<repo>-tx-<SLICE-ID>`,
    `       git stash pop`,
    `       git add <files>`,
    `       node scripts/coa-merge.mjs --message="type(scope): desc (SLICE-ID)" --agent=${agentRole}`,
    ``,
    `     This is fewer commands than the override path.`,
    `     Real emergency? See docs/guides/r5-override-emergency.md.`,
  ];
  if (overrideReason) {
    lines.push(``, `     Override refused: ${overrideReason}`);
  }
  return lines.join('\n') + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const selfTest = args.includes('--self-test');
  const jsonMode = args.includes('--json');

  if (selfTest) {
    runSelfTest();
    return;
  }

  const worktreeRoot = getWorktreeRoot();

  if (worktreeRoot === null) {
    // Not a git repo — no false positives outside git
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ ok: true, worktreeRoot: null, isTransport: null }) + '\n');
    }
    process.exit(0);
    return;
  }

  const isTransport = isTransportWorktree(worktreeRoot);

  if (jsonMode) {
    // JSON mode: report state without consuming the override (no side effects).
    process.stdout.write(JSON.stringify({ ok: isTransport, worktreeRoot, isTransport }) + '\n');
    process.exit(isTransport ? 0 : 1);
    return;
  }

  if (isTransport) {
    // Transport worktree — allow silently
    process.exit(0);
    return;
  }

  // Main worktree — attempt one-shot rationale-file override.
  const stagedFiles = getStagedFiles(worktreeRoot);
  const overrideResult = consumeOverride(stagedFiles, worktreeRoot);

  if (overrideResult.ok) {
    // Gap 3 (TPL-331): consumeOverride is now pure-validation. The caller
    // performs the side effects: write log → git add log → delete override file.
    // This ordering ensures the log entry is staged before the override is
    // consumed, so the audit trail lands in the commit atomically.
    const { logEntry, logPath } = overrideResult;
    const overridePath = resolve(worktreeRoot, '.coa', 'r5-override.json');

    mkdirSync(resolve(worktreeRoot, '.coa', 'r5-override-log'), { recursive: true });
    writeFileSync(logPath, JSON.stringify(logEntry, null, 2) + '\n', 'utf8');

    // Stage the log entry so it lands in the commit with the audit trail.
    spawnSync('git', ['add', logPath], { cwd: worktreeRoot, encoding: 'utf8' });

    unlinkSync(overridePath);

    process.stderr.write(
      `[R5] Override accepted via .coa/r5-override.json. Direct commit authorised.\n` +
      `     File consumed and archived to .coa/r5-override-log/.\n`
    );
    process.exit(0);
    return;
  }

  process.stderr.write(buildRefusalMessage(overrideResult.reason));
  process.exit(1);
}

// Guard against running as a side-effect on import. When this file is imported
// for its exports (e.g. by unit tests), main() must NOT run — it exits the
// process when the working directory is not a transport worktree.
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main();
}
