/* @HEADER
 * @version 0.8.1 | 2026-05-10
 * @purpose Pre-commit Phase 2.6 guard — refuses staged commits whose net test()/it() block count drops in tests/** files unless two-factor operator override is present.
 * @sidecar test-deletion-guard.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-314 — test-deletion-guard.
 *
 * Defends against silent test coverage loss in staged commits. Counts the
 * net change in `test(...)` / `it(...)` call sites across staged unified
 * diffs of test files; if removed > added, refuses the commit unless the
 * operator authorizes the deletion via two factors:
 *
 *   1. `COA_OPERATOR=1` in the environment, AND
 *   2. `Allow-test-deletion: <reason ≥3 chars>` line in the commit-message
 *      body (read from .git/COMMIT_EDITMSG, which `git commit -m "<msg>"`
 *      and `coa-merge --message=` both populate before pre-commit fires).
 *
 * Scope (Design Call A): only `\\btest\\(` and `\\bit\\(` patterns count.
 * `describe(`/`suite(` are organizational wrappers, not test definitions.
 * Removing a `describe()` while preserving its inner `test()`s is a
 * legitimate refactor that nets zero — the guard correctly stays silent.
 *
 * Path scope: only paths matching `tests/**` AND ending in
 * `.test.{mjs,js,cjs,ts,mts,cts,tsx,jsx}` or
 * `.spec.{mjs,js,cjs,ts,mts,cts,tsx,jsx}`, plus the same-suffix files under
 * `scripts/**` (mirrors the test-isolation walker).
 *
 * Detection is regex-based on staged diff text. AST parsing is deliberately
 * out of scope — over-trigger on `test(` literals inside string bodies is
 * accepted as the cost of zero new dependencies (operator can override).
 *
 * @see docs/adr/0041-test-deletion-guard.md
 * @see docs/rules-registry.md (R9 entry)
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Test-block detection. Anchored at a non-word boundary so `bestTest(` and
// `submit(` do not match. Matches both source-line additions and removals
// in unified diff text.
const TEST_BLOCK_RE = /\b(?:test|it)\s*\(/g;

// File-path filters (POSIX paths from git diff --cached --name-only).
// Two surfaces: tests/** and scripts/** with .{test,spec}.{ext} suffix.
const TEST_FILE_RE =
  /(?:^|\/)(?:tests|scripts)\/.+\.(?:test|spec)\.(?:mjs|js|cjs|mts|cts|ts|tsx|jsx)$/;

// Override marker — the line must start with `Allow-test-deletion:` and have
// ≥3 non-whitespace-bracketed chars after the colon. Multiline-mode anchors
// the start so it can sit anywhere in the body.
const OVERRIDE_LINE_RE = /^Allow-test-deletion:\s*(\S.*)$/m;
const MIN_REASON_LEN = 3;

// ---------------------------------------------------------------------------
// Git probes
// ---------------------------------------------------------------------------

function git(args, cwd = process.cwd()) {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    status: r.status,
  };
}

function stagedDiff(cwd) {
  // -U0 keeps hunks tight (no surrounding context) so + / - line counts
  // reflect the actual change set, not the editor's neighbourhood.
  const r = git(['diff', '--cached', '--unified=0', '--no-color', '--no-renames'], cwd);
  if (!r.ok) return '';
  return r.stdout;
}

function commitEditMsgPath(cwd) {
  const r = git(['rev-parse', '--git-dir'], cwd);
  if (!r.ok) return null;
  const gitDir = r.stdout.trim();
  if (!gitDir) return null;
  // git rev-parse --git-dir returns either an absolute path (linked worktree)
  // or a relative path like ".git". Resolve relative to cwd.
  const abs = resolve(cwd, gitDir);
  return join(abs, 'COMMIT_EDITMSG');
}

// ---------------------------------------------------------------------------
// Diff parsing
// ---------------------------------------------------------------------------

/**
 * Parse a unified diff text and return a map of file → { added, removed }
 * counts of lines matching TEST_BLOCK_RE. Only files whose path matches
 * TEST_FILE_RE are tracked.
 *
 * Format reminder:
 *   diff --git a/<path> b/<path>
 *   --- a/<old>
 *   +++ b/<new>
 *   @@ -X,Y +A,B @@
 *   -<line>      ← deletion candidate
 *   +<line>      ← addition candidate
 *
 * `+++` and `---` lines are file headers and must be skipped.
 */
export function parseDiff(diffText) {
  const result = new Map();
  if (!diffText) return result;

  const lines = diffText.split('\n');
  let currentFile = null;
  let inHunk = false;

  for (const raw of lines) {
    if (raw.startsWith('diff --git ')) {
      currentFile = null;
      inHunk = false;
      continue;
    }
    if (raw.startsWith('+++ ')) {
      // +++ b/<path>  OR  +++ /dev/null
      const m = raw.match(/^\+\+\+ b\/(.+)$/);
      if (m) {
        const path = m[1];
        currentFile = TEST_FILE_RE.test(path) ? path : null;
      }
      // When +++ /dev/null: the file is being deleted. Do NOT reset currentFile
      // here — the pre-image path was already set by the preceding `--- a/<path>`
      // line and must remain so that subsequent `-` lines are attributed to the
      // correct file. Resetting to null was the TPL-323 bug: deletion-line counts
      // were lost, causing whole-file test-file deletions to silently pass.
      inHunk = false;
      continue;
    }
    if (raw.startsWith('--- ')) {
      // For deleted files (b/ side is /dev/null), use the a/ path so we
      // still attribute the test() removals.
      const m = raw.match(/^--- a\/(.+)$/);
      if (m && !currentFile) {
        const path = m[1];
        if (TEST_FILE_RE.test(path)) currentFile = path;
      }
      continue;
    }
    if (raw.startsWith('@@')) {
      inHunk = true;
      continue;
    }
    if (!inHunk || !currentFile) continue;

    if (raw.startsWith('+')) {
      const matches = raw.slice(1).match(TEST_BLOCK_RE);
      if (matches) {
        const entry = result.get(currentFile) || { added: 0, removed: 0 };
        entry.added += matches.length;
        result.set(currentFile, entry);
      }
    } else if (raw.startsWith('-')) {
      const matches = raw.slice(1).match(TEST_BLOCK_RE);
      if (matches) {
        const entry = result.get(currentFile) || { added: 0, removed: 0 };
        entry.removed += matches.length;
        result.set(currentFile, entry);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Override extraction
// ---------------------------------------------------------------------------

/**
 * Pull the operator-override reason from a commit message body. Returns
 * null when absent or below MIN_REASON_LEN.
 */
export function extractOverrideReason(commitMsg) {
  if (typeof commitMsg !== 'string' || commitMsg.length === 0) return null;
  const m = commitMsg.match(OVERRIDE_LINE_RE);
  if (!m) return null;
  const reason = m[1].trim();
  if (reason.length < MIN_REASON_LEN) return null;
  return reason;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function runGuard({ cwd = process.cwd(), env = process.env } = {}) {
  const diff = stagedDiff(cwd);
  const perFile = parseDiff(diff);

  let totalAdded = 0;
  let totalRemoved = 0;
  for (const { added, removed } of perFile.values()) {
    totalAdded += added;
    totalRemoved += removed;
  }
  const net = totalRemoved - totalAdded;

  if (net <= 0) {
    return { ok: true, net, perFile };
  }

  // Net deletion detected. Check the two-factor override.
  const operatorEnv = env.COA_OPERATOR === '1';
  const editMsgPath = commitEditMsgPath(cwd);
  let commitMsg = '';
  if (editMsgPath && existsSync(editMsgPath)) {
    try { commitMsg = readFileSync(editMsgPath, 'utf8'); } catch { /* fall through */ }
  }
  const reason = extractOverrideReason(commitMsg);

  if (operatorEnv && reason) {
    process.stderr.write(
      `[test-deletion-guard] override accepted: ${reason}\n`,
    );
    return { ok: true, net, perFile, override: reason };
  }

  // Refuse.
  return {
    ok: false,
    net,
    perFile,
    operatorEnv,
    hasReason: Boolean(reason),
  };
}

function explainRefusal(result) {
  const lines = [
    'test-deletion-guard: REFUSED — staged diff removes more test()/it() blocks than it adds.',
    '',
  ];
  for (const [file, { added, removed }] of result.perFile.entries()) {
    const fileNet = removed - added;
    if (fileNet > 0) {
      lines.push(`  ${file}: -${removed} +${added} (net deletion ${fileNet})`);
    }
  }
  lines.push('');
  lines.push(`Total net deletion: ${result.net} test()/it() block(s).`);
  lines.push('');
  lines.push('If this deletion is intentional, BOTH factors are required to override:');
  lines.push('  1. Set COA_OPERATOR=1 in your environment.');
  lines.push('  2. Add a line `Allow-test-deletion: <reason ≥3 chars>` to the commit-message body.');
  lines.push('');
  if (!result.operatorEnv) lines.push('  Currently: COA_OPERATOR is NOT set.');
  if (!result.hasReason) lines.push('  Currently: Allow-test-deletion line is missing or reason is too short.');
  lines.push('');
  lines.push('See docs/adr/0041-test-deletion-guard.md.');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes('--json');

  const result = runGuard();

  if (result.ok) {
    if (wantJson) {
      console.log(JSON.stringify({
        ok: true,
        net: result.net,
        override: result.override ?? null,
      }));
    }
    process.exit(0);
  }

  if (wantJson) {
    const perFile = {};
    for (const [k, v] of result.perFile.entries()) perFile[k] = v;
    console.log(JSON.stringify({
      ok: false,
      net: result.net,
      perFile,
      operatorEnv: result.operatorEnv,
      hasReason: result.hasReason,
    }));
  } else {
    console.error(explainRefusal(result));
  }
  process.exit(1);
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('test-deletion-guard.mjs') ||
  process.argv[1].endsWith('test-deletion-guard')
);

if (isDirectRun) main();

export { ROOT, TEST_BLOCK_RE, TEST_FILE_RE, OVERRIDE_LINE_RE, MIN_REASON_LEN };
