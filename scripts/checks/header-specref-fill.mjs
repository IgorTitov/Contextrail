/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Backfill specRefs on sidecars by mining file-path references from backlog acceptance criteria.
 * @sidecar header-specref-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Derives per-file specRefs from docs/backlog/_generated/backlog.json:
 * - Every backlog item's acceptance criteria are scanned for "modules/<...>" file paths.
 * - Each mentioned file gets that item's TPL-id added to its sidecar's specRefs.
 * - Test files referenced via test_refs get the same TPL-id.
 *
 * Only sidecars that currently lack specRefs are touched. Files with an
 * existing specRefs entry are left alone — this pass is additive discovery,
 * not rewrite.
 *
 * Usage: node scripts/checks/header-specref-fill.mjs [--dry-run]
 */

import fs from 'node:fs';
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

// ---------------------------------------------------------------------------
// Load backlog and build file → TPL-id map
// ---------------------------------------------------------------------------

const backlog = JSON.parse(fs.readFileSync('docs/backlog/_generated/backlog.json', 'utf8'));
const items = backlog.items || [];

/** @type {Map<string, Set<string>>} */
const fileToIds = new Map();

function addRef(file, id) {
  const norm = toPosix(file).replace(/^\.\//, '');
  if (!fileToIds.has(norm)) fileToIds.set(norm, new Set());
  fileToIds.get(norm).add(id);
}

const FILE_RE = /\b((?:modules|apps|packages|tests|scripts|docs|templates)\/[\w./-]+\.\w+)/g;

for (const item of items) {
  if (!item.id) continue;
  const id = item.id;

  // acceptance criteria — free-form strings that often name files.
  if (Array.isArray(item.acceptance)) {
    for (const line of item.acceptance) {
      if (typeof line !== 'string') continue;
      for (const match of line.matchAll(FILE_RE)) addRef(match[1], id);
    }
  }

  // test_refs — exact file paths.
  if (Array.isArray(item.test_refs)) {
    for (const ref of item.test_refs) {
      if (typeof ref === 'string') addRef(ref, id);
    }
  }

  // bdd_refs — exact file paths.
  if (Array.isArray(item.bdd_refs)) {
    for (const ref of item.bdd_refs) {
      if (typeof ref === 'string') addRef(ref, id);
    }
  }
}

console.log(`backlog: ${items.length} items, ${fileToIds.size} files referenced`);

// ---------------------------------------------------------------------------
// Sidecar mutation
// ---------------------------------------------------------------------------

function hasSpecRefs(text) {
  return /^specRefs:/m.test(text);
}

function findClosingIndex(lines) {
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') return i;
  }
  return -1;
}

function insertSpecRefs(text, ids) {
  if (!text.startsWith('---')) return null;
  const lines = text.split('\n');
  const closingIdx = findClosingIndex(lines);
  if (closingIdx === -1) return null;

  const sorted = [...ids].sort();
  let block;
  if (sorted.length === 1) {
    block = [`specRefs: ${sorted[0]}`];
  } else {
    block = ['specRefs:', ...sorted.map((id) => `  - ${id}`)];
  }
  lines.splice(closingIdx, 0, ...block);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = await collectRepoFiles();
let touched = 0;
let scanned = 0;

for (const file of files) {
  const posix = toPosix(file);
  const ids = fileToIds.get(posix);
  if (!ids || ids.size === 0) continue;

  const sc = sidecarPath(file);
  let sidecarText;
  try {
    sidecarText = await readText(sc);
  } catch {
    continue;
  }
  scanned++;
  if (hasSpecRefs(sidecarText)) continue;

  const next = insertSpecRefs(sidecarText, ids);
  if (!next || next === sidecarText) continue;

  if (DRY_RUN) {
    console.log(`DRY: would add specRefs=${[...ids].sort().join(',')} to ${sc}`);
  } else {
    await ensureWriteIfChanged(sc, next);
  }
  touched++;
}

console.log(`header-specref-fill: scanned ${scanned}, ${touched} updated`);
