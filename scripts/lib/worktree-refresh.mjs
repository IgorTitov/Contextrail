/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure stamp-only-diff classifier — distinguishes header @version residue from real WIP so a worktree refresh can discard the former without touching the latter.
 * @sidecar worktree-refresh.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R4 — worktree refresh classifier.
 *
 * `classifyDiff(diffText)` accepts the raw output of `git diff --no-color
 * HEAD -- <file>` for a single file and returns one of:
 *
 *   'no-diff'     — diff text is empty, the file is unchanged vs HEAD.
 *   'stamp-only'  — every change is a single-line @version stamp bump
 *                   inside the slim-header range (first 10 lines of file)
 *                   AND every removed line is paired with an added line.
 *   'has-logic'   — anything else: real edits, whitespace-only churn,
 *                   line-ending churn, file renames, header-line additions
 *                   without a paired removal, multi-line block changes, or
 *                   stamps that reach past the slim-header range.
 *
 * The classifier is conservative: when in doubt, return 'has-logic' so the
 * caller (coa-worktree --refresh) preserves the file rather than restoring
 * it. Discarding real WIP would be silent data loss; preserving stamp
 * residue is at worst one extra restore step.
 *
 * The classifier does NOT spawn git. It operates on a pre-fetched diff
 * string so unit tests can pin every edge case against fixture diffs
 * without hitting the filesystem. ADR-0016 documents the safety property.
 *
 * @see scripts/coa-worktree.mjs#refresh
 * @see docs/adr/0016-worktree-lifecycle.md
 */

/**
 * Maximum line number (1-based, on the new side of the diff) at which a
 * stamp-only change is allowed to appear. The slim inline header is at
 * most 7 lines (per ADR-0009) plus a small grace margin for sidecar
 * frontmatter and any leading shebang. A stamp located past this line is
 * classified as 'has-logic' — we never assume it is just a header bump.
 */
export const SLIM_HEADER_RANGE = 10;

/**
 * Match an @version declaration in the slim-header format.
 *
 * Accepts comment-prefix characters that appear in any of the inline
 * header dialects this repository uses:
 *   - JS/MJS:  ` * @version 0.7.37 | 2026-04-29`
 *   - Markdown frontmatter:  `@version 0.7.37 | 2026-04-29`
 *   - Bash hooks: `# @version 0.7.37 | 2026-04-29`
 *   - HTML/MD comment: `<!-- ... @version 0.7.37 | 2026-04-29`
 *
 * Not a constant — each invocation of classifyDiff() reuses a fresh
 * RegExp via the inline literal so global-state lastIndex carryover
 * cannot leak between calls.
 */
const STAMP_LINE_RE = /^[\s*/#<!-]*@version\s+\d+\.\d+\.\d+\s*\|\s*\d{4}-\d{2}-\d{2}\s*$/;

/**
 * Parse a unified-diff hunk header like `@@ -1,5 +1,5 @@` into the
 * new-side start line and count. Returns null when the header does not
 * match the expected shape.
 *
 * Single-line hunks omit the count: `@@ -1 +1 @@` is equivalent to
 * `@@ -1,1 +1,1 @@`. Both forms are accepted.
 */
export function parseHunkHeader(line) {
  const m = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/.exec(line);
  if (!m) return null;
  return {
    oldStart: Number(m[1]),
    oldCount: m[2] === undefined ? 1 : Number(m[2]),
    newStart: Number(m[3]),
    newCount: m[4] === undefined ? 1 : Number(m[4]),
  };
}

/**
 * Classify a unified-diff string for a single file.
 *
 * @param {string} diffText - raw output of `git diff --no-color HEAD -- <path>`
 * @returns {'no-diff' | 'stamp-only' | 'has-logic'}
 */
export function classifyDiff(diffText) {
  if (typeof diffText !== 'string' || diffText.trim() === '') {
    return 'no-diff';
  }

  // File-mode signals that are never stamp-only by themselves.
  // Renames, mode changes, and deletions are real intent — preserve.
  if (
    /^rename from\s/m.test(diffText) ||
    /^rename to\s/m.test(diffText) ||
    /^similarity index\s/m.test(diffText) ||
    /^new file mode\s/m.test(diffText) ||
    /^deleted file mode\s/m.test(diffText) ||
    /^old mode\s/m.test(diffText) ||
    /^new mode\s/m.test(diffText)
  ) {
    return 'has-logic';
  }

  const lines = diffText.split('\n');
  const hunks = [];
  let current = null;

  for (const raw of lines) {
    if (raw.startsWith('@@')) {
      const meta = parseHunkHeader(raw);
      if (!meta) {
        // Malformed hunk header — fail conservative.
        return 'has-logic';
      }
      current = { meta, body: [] };
      hunks.push(current);
      continue;
    }
    // Skip diff metadata before the first hunk: `diff --git`, `index`,
    // `---`, `+++` headers. They do not carry payload changes.
    if (current === null) continue;
    // Inside a hunk now — collect every body line including context.
    current.body.push(raw);
  }

  if (hunks.length === 0) {
    // The diff text was non-empty but contained no hunks — typically
    // a binary diff or a metadata-only change. Treat as has-logic so
    // the operator decides.
    return 'has-logic';
  }

  for (const hunk of hunks) {
    if (!isStampOnlyHunk(hunk)) {
      return 'has-logic';
    }
  }
  return 'stamp-only';
}

/**
 * A hunk is stamp-only iff:
 *   1. Its new-side range stays inside the slim-header window
 *      (newStart + newCount - 1 ≤ SLIM_HEADER_RANGE).
 *   2. The number of removed lines equals the number of added lines
 *      (no pure additions, no pure deletions — pairs only).
 *   3. Every removed line and every added line, after stripping the
 *      diff's leading `-` / `+` marker, matches STAMP_LINE_RE.
 *
 * Context lines (those starting with a single space) and the trailing
 * "\\ No newline at end of file" sentinel are ignored — they neither
 * help nor hurt the stamp-only verdict.
 */
function isStampOnlyHunk(hunk) {
  const { meta, body } = hunk;
  if (meta.newStart + Math.max(meta.newCount, 1) - 1 > SLIM_HEADER_RANGE) {
    return false;
  }

  let removed = 0;
  let added = 0;
  for (const line of body) {
    if (line.length === 0) {
      // Empty line inside a hunk body is a single-space context line
      // that lost its trailing newline through split('\n'). Treat as
      // context — not a payload line.
      continue;
    }
    const marker = line[0];
    if (marker === '\\') {
      // "\\ No newline at end of file" sentinel — ignore.
      continue;
    }
    if (marker === ' ') {
      // Context line — ignore.
      continue;
    }
    const payload = line.slice(1);
    if (marker === '-') {
      if (!STAMP_LINE_RE.test(payload)) return false;
      removed += 1;
      continue;
    }
    if (marker === '+') {
      if (!STAMP_LINE_RE.test(payload)) return false;
      added += 1;
      continue;
    }
    // Anything else (e.g., a stray `~` or unexpected prefix) — fail safe.
    return false;
  }

  if (removed === 0 && added === 0) {
    // No payload changes at all — this isn't a meaningful hunk. Some
    // git renderings can emit a hunk that contains only context when
    // a mode-only change is reported alongside an empty diff. Treat
    // that as has-logic so the operator decides.
    return false;
  }

  return removed === added;
}
