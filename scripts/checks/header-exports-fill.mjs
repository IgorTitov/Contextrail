/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Backfill exports list on public-api.mjs sidecars by parsing every export statement in the source.
 * @sidecar header-exports-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Every `modules/<mod>/public-api.mjs` is the single entry point for its
 * bounded context. Cross-module consumers must import from it only — yet
 * sidecars currently do not list which symbols are actually exported. A
 * feature-implementer agent has to open the source to discover the API
 * surface before composing a wiring change.
 *
 * This filler walks each `public-api.mjs`, parses `export { … }` and
 * `export const X` / `export function X` / `export class X` statements, and
 * writes the sorted, deduplicated list into `exports:` on the sidecar.
 *
 * Idempotent — re-running rewrites the same list, but only when it actually
 * changed (so the field tracks the source automatically).
 *
 * Usage: node scripts/checks/header-exports-fill.mjs [--dry-run]
 */

import path from 'node:path';
import { toPosix, readText, ensureWriteIfChanged } from '../lib/fs-helpers.mjs';
import { collectRepoFiles, sidecarPath } from '../lib/header.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
// Parallel-session safety: require --scope or --dry-run when called manually.
// Prevents accidental repo-wide sidecar overwrites in parallel sessions.
if (!DRY_RUN && !process.argv.includes('--scope') && process.env.COA_PRE_COMMIT !== '1') {
  const name = import.meta.url.split('/').pop();
  console.error(
    name +
      ': repo-wide run requires --scope=<dir> or --dry-run.\n' +
      "Running without scope in a parallel session can overwrite other sessions' files.\n" +
      'Use: node scripts/checks/' +
      name +
      ' --scope=modules/my-module',
  );
  process.exit(1);
}

const CHECK_ONLY = process.argv.includes('--check');

// ---------------------------------------------------------------------------
// Export extraction
// ---------------------------------------------------------------------------

/**
 * Strip block and line comments to keep the regex pass simple. Preserves
 * line breaks so positional reasoning would still work if needed later.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const NAMED_GROUP_RE = /export\s*(?:type)?\s*\{([^}]+)\}/g;
const NAMED_DECL_RE =
  /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g;

function extractExports(source) {
  const clean = stripComments(source);
  const set = new Set();

  let m;
  while ((m = NAMED_GROUP_RE.exec(clean)) !== null) {
    const inside = m[1];
    for (const raw of inside.split(',')) {
      const piece = raw.trim();
      if (!piece) continue;
      // Handle `foo as bar` — keep the exposed (post-`as`) name.
      const asMatch = piece.match(/(?:^|\s)as\s+([A-Za-z_$][\w$]*)\s*$/);
      const name = asMatch ? asMatch[1] : piece.replace(/\s+/g, '').replace(/^type\s+/, '');
      if (/^[A-Za-z_$][\w$]*$/.test(name)) set.add(name);
    }
  }

  while ((m = NAMED_DECL_RE.exec(clean)) !== null) {
    set.add(m[1]);
  }

  return [...set].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// Sidecar mutation
// ---------------------------------------------------------------------------

function findClosingIndex(lines) {
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') return i;
  }
  return -1;
}

/**
 * Replace the existing `exports:` block (if present) with the new one, or
 * append it before the closing `---` when missing. The block format is a
 * YAML list of strings — one per line — to keep diffs and grep friendly.
 */
function writeExports(text, exports) {
  if (!text.startsWith('---')) return null;
  const lines = text.split('\n');
  const closingIdx = findClosingIndex(lines);
  if (closingIdx === -1) return null;

  // Strip any existing exports: block and its child entries.
  const out = [];
  let skipping = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i > 0 && i < closingIdx) {
      if (/^exports:\s*$/.test(line)) {
        skipping = true;
        continue;
      }
      if (skipping) {
        if (/^\s+- /.test(line)) continue;
        skipping = false;
      }
    }
    out.push(line);
  }

  const newClosingIdx = (() => {
    for (let i = 1; i < out.length; i++) {
      if (out[i] === '---') return i;
    }
    return -1;
  })();
  if (newClosingIdx === -1) return null;

  const block = ['exports:', ...exports.map((e) => `  - ${e}`)];
  out.splice(newClosingIdx, 0, ...block);
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const PUBLIC_API_RE = /^modules\/[^/]+\/public-api\.(mjs|cjs|js|ts)$/;

const files = await collectRepoFiles();
let scanned = 0;
let touched = 0;
let totalExports = 0;
const empty = [];

for (const file of files) {
  const posix = toPosix(file);
  if (!PUBLIC_API_RE.test(posix)) continue;

  const sc = sidecarPath(file);
  let sidecarText;
  let source;
  try {
    sidecarText = await readText(sc);
    source = await readText(file);
  } catch {
    continue;
  }
  scanned++;

  const exports = extractExports(source);
  if (exports.length === 0) {
    empty.push(posix);
    continue;
  }
  totalExports += exports.length;

  const next = writeExports(sidecarText, exports);
  if (!next || next === sidecarText) continue;

  if (CHECK_ONLY || DRY_RUN) {
    console.log(
      `${CHECK_ONLY ? 'DRIFT' : 'DRY'}: ${path.basename(sc)} — ${exports.length} exports`,
    );
  } else {
    await ensureWriteIfChanged(sc, next);
  }
  touched++;
}

console.log(
  `header-exports-fill: scanned ${scanned} public-api files, ${touched} updated, ${totalExports} exports total`,
);
if (empty.length > 0) {
  console.log(`empty (no exports parsed):`);
  for (const e of empty) console.log(`  ${e}`);
}

if (CHECK_ONLY && touched > 0) {
  console.error(`header-exports-fill: ${touched} sidecar(s) have drifted exports`);
  process.exit(1);
}
