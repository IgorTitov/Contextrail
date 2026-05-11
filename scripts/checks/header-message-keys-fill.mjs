/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Backfill messageKeys on messages.mjs sidecars by parsing the bounded i18n locales object for the canonical English key set.
 * @sidecar header-message-keys-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Each modules/<mod>/messages.mjs file owns a bounded i18n key registry of the
 * shape `const locales = { en: { 'mod.area.key': '...' } }`. Those keys are the
 * machine-readable surface of the module's user-facing copy.
 *
 * This pass extracts the English key list from each messages.mjs and writes it
 * to the matching sidecar as `messageKeys: [...]`. An agent can then see the
 * full message catalogue from the sidecar without reading source.
 *
 * Idempotent — sidecars with an existing messageKeys field are skipped.
 *
 * Usage: node scripts/checks/header-message-keys-fill.mjs [--dry-run]
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
    name + ': repo-wide run requires --scope=<dir> or --dry-run.\n' +
    "Running without scope in a parallel session can overwrite other sessions' files.\n" +
    'Use: node scripts/checks/' + name + ' --scope=modules/my-module',
  );
  process.exit(1);
}


// ---------------------------------------------------------------------------
// Key extraction
// ---------------------------------------------------------------------------

/**
 * Parse the English key set out of a messages.mjs source file.
 *
 * Expects a `const locales = { en: { ... } }` block with single-quoted string
 * keys. Returns an empty array if the shape does not match — this is a
 * conservative parser, not a full JS evaluator.
 */
function extractKeys(source) {
  const enMatch = source.match(/en:\s*\{([\s\S]*?)\n\s*\},?\n/);
  if (!enMatch) return [];
  const body = enMatch[1];
  const keys = [];
  const keyRe = /^\s*'([^']+)'\s*:/gm;
  let m;
  while ((m = keyRe.exec(body)) !== null) {
    keys.push(m[1]);
  }
  return keys;
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

function insertMessageKeys(text, keys) {
  if (!text.startsWith('---')) return null;
  const lines = text.split('\n');
  const closingIdx = findClosingIndex(lines);
  if (closingIdx === -1) return null;

  const block = ['messageKeys:'];
  for (const k of keys) block.push(`  - ${k}`);
  lines.splice(closingIdx, 0, ...block);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = await collectRepoFiles();
let touched = 0;
let scanned = 0;
let empty = 0;

for (const file of files) {
  const posix = toPosix(file);
  if (!/^modules\/[^/]+\/messages\.(mjs|cjs|js)$/.test(posix)) continue;

  const sc = sidecarPath(file);
  let sidecarText;
  try {
    sidecarText = await readText(sc);
  } catch {
    continue;
  }
  scanned++;

  if (hasField(sidecarText, 'messageKeys')) continue;

  const source = fs.readFileSync(file, 'utf8');
  const keys = extractKeys(source);
  if (keys.length === 0) {
    empty++;
    console.log(`empty: ${posix} (no en keys parsed)`);
    continue;
  }

  const next = insertMessageKeys(sidecarText, keys);
  if (!next || next === sidecarText) continue;

  if (DRY_RUN) {
    console.log(`DRY: would add ${keys.length} keys to ${sc}`);
  } else {
    await ensureWriteIfChanged(sc, next);
  }
  touched++;
}

console.log(
  `header-message-keys-fill: scanned ${scanned} messages.mjs sidecars, ${touched} updated, ${empty} empty`,
);
