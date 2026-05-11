/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Backfill implementsPort on adapter sidecars by parsing the port import in each adapter source.
 * @sidecar header-implements-port-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Adapter sidecars currently encode adapterType (storage/network/...) but not
 * the specific port they implement. The port↔adapter pairing is recoverable
 * deterministically: every adapter imports its port from `../ports/<name>.mjs`.
 *
 * This filler scans each `modules/<mod>/adapters/*-adapter.{mjs,cjs,js,ts}`
 * source for that import and writes `implementsPort: <port-basename>` into the
 * matching sidecar. Idempotent — sidecars with an existing implementsPort
 * field are skipped.
 *
 * Usage: node scripts/checks/header-implements-port-fill.mjs [--dry-run]
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

// ---------------------------------------------------------------------------
// Port discovery from adapter source
// ---------------------------------------------------------------------------

/**
 * Match any import that resolves into the sibling ports/ directory and
 * capture the port file basename (without extension).
 *
 * Examples matched:
 *   import { CachePort } from '../ports/cache-port.mjs';
 *   import type { LogPort } from '../ports/log-port.ts';
 *   import('../ports/scheduler-port.mjs')
 */
const PORT_IMPORT_RE = /['"]\.\.\/ports\/([a-z0-9-]+-port)\.(?:mjs|cjs|js|ts|d\.ts)['"]/i;

/**
 * Some modules expose port types via a sibling `../types.d.ts` instead of a
 * direct `../ports/<name>` import. In that case the adapter still references
 * the port name in a typedef like:
 *
 *   @typedef {import('../types.d.ts').RetrievalPort} RetrievalPort
 *
 * Convert the PascalCase `RetrievalPort` to kebab `retrieval-port` so we
 * preserve a valid pairing even when the import is indirect.
 */
const TYPES_PORT_RE = /import\(['"]\.\.\/types\.d\.ts['"]\)\.([A-Z][A-Za-z0-9]*Port)\b/;

function pascalToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function extractPortBasename(source) {
  const direct = source.match(PORT_IMPORT_RE);
  if (direct) return direct[1];
  const indirect = source.match(TYPES_PORT_RE);
  if (indirect) return pascalToKebab(indirect[1]);
  return null;
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

function insertImplementsPort(text, portBase) {
  if (!text.startsWith('---')) return null;
  const lines = text.split('\n');
  const closingIdx = findClosingIndex(lines);
  if (closingIdx === -1) return null;
  lines.splice(closingIdx, 0, `implementsPort: ${portBase}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ADAPTER_RE = /^modules\/[^/]+\/adapters\/.*-adapter\.(mjs|cjs|js|ts)$/;

const files = await collectRepoFiles();
let scanned = 0;
let touched = 0;
const unmatched = [];

for (const file of files) {
  const posix = toPosix(file);
  if (!ADAPTER_RE.test(posix)) continue;
  // Skip declaration files — they re-export, they don't implement.
  if (posix.endsWith('.d.ts')) continue;

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

  if (hasField(sidecarText, 'implementsPort')) continue;

  const portBase = extractPortBasename(source);
  if (!portBase) {
    unmatched.push(posix);
    continue;
  }

  const next = insertImplementsPort(sidecarText, portBase);
  if (!next || next === sidecarText) continue;

  if (DRY_RUN) {
    console.log(`DRY: would add implementsPort=${portBase} to ${path.basename(sc)}`);
  } else {
    await ensureWriteIfChanged(sc, next);
  }
  touched++;
}

console.log(`header-implements-port-fill: scanned ${scanned} adapters, ${touched} updated`);
if (unmatched.length > 0) {
  console.log(`unmatched (no '../ports/<name>-port' import found):`);
  for (const u of unmatched) console.log(`  ${u}`);
}
