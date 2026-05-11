/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Backfill linkedDocs on module sidecars by pointing at the nearest README in the same folder, when one exists.
 * @sidecar header-linked-docs-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Many sidecars under modules/ do not declare linkedDocs even though a
 * README.md sits in the same folder. This pass adds the nearest README as a
 * linkedDocs entry so an agent reading the sidecar gets one fewer navigation
 * hop to the human-facing context.
 *
 * Idempotent — sidecars with an existing linkedDocs field are skipped.
 *
 * Usage: node scripts/checks/header-linked-docs-fill.mjs [--dry-run]
 */

import fs from 'node:fs';
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

// ---------------------------------------------------------------------------
// README discovery
// ---------------------------------------------------------------------------

function nearestReadme(file) {
  const dir = path.dirname(file);
  const candidate = path.join(dir, 'README.md');
  return fs.existsSync(candidate) ? toPosix(candidate) : null;
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

function hasField(text, field) {
  const re = new RegExp(`^${field}:`, 'm');
  return re.test(text);
}

function insertLinkedDocs(text, readme) {
  if (!text.startsWith('---')) return null;
  const lines = text.split('\n');
  const closingIdx = findClosingIndex(lines);
  if (closingIdx === -1) return null;
  lines.splice(closingIdx, 0, `linkedDocs: ${readme}`);
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
  if (!posix.startsWith('modules/')) continue;
  // README itself is the target, not a target.
  if (path.basename(posix).toLowerCase() === 'readme.md') continue;

  const sc = sidecarPath(file);
  let sidecarText;
  try {
    sidecarText = await readText(sc);
  } catch {
    continue;
  }
  scanned++;

  if (hasField(sidecarText, 'linkedDocs')) continue;

  const readme = nearestReadme(file);
  if (!readme) continue;

  const next = insertLinkedDocs(sidecarText, readme);
  if (!next || next === sidecarText) continue;

  if (DRY_RUN) {
    console.log(`DRY: would add linkedDocs=${readme} to ${sc}`);
  } else {
    await ensureWriteIfChanged(sc, next);
  }
  touched++;
}

console.log(`header-linked-docs-fill: scanned ${scanned} sidecars, ${touched} updated`);
