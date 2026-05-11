/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Backfill portCategory and contractTests on port sidecars based on a curated port-name dictionary and tests/contract glob.
 * @sidecar header-port-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Fills two machine-verifiable fields on modules/<mod>/ports/*-port.mjs sidecars:
 *
 * 1. portCategory — semantic category of the port (storage, network, credential,
 *    logging, telemetry, messaging, llm, ai-pipeline, ui-i18n, ui-notification,
 *    workflow, infrastructure, example). Pairs with adapterType so an agent can
 *    reason about port↔adapter compatibility from sidecars alone.
 *
 * 2. contractTests — explicit pointer to the hex-contract test file for this
 *    module, when one exists at tests/contract/<module>-hex-contract.test.mjs.
 *    Currently this knowledge is buried inside `tests:` mixed with unit tests.
 *
 * Both fills are additive only — files with an existing portCategory or
 * contractTests entry are skipped. Re-running produces zero changes.
 *
 * Usage: node scripts/checks/header-port-fill.mjs [--dry-run]
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
// Curated port-name → category dictionary
// ---------------------------------------------------------------------------

const PORT_CATEGORIES = {
  // storage
  'cache-port': 'storage',
  'database-port': 'storage',
  'storage-port': 'storage',
  'state-port': 'storage',
  'file-port': 'storage',
  'graph-store-port': 'storage',
  // network
  'api-client-port': 'network',
  'transport-port': 'network',
  'realtime-port': 'network',
  // observability
  'log-port': 'logging',
  'analytics-port': 'telemetry',
  // identity
  'auth-port': 'credential',
  'permission-port': 'credential',
  // ui surface
  'i18n-port': 'ui-i18n',
  'notification-port': 'ui-notification',
  // ai
  'ai-chat-port': 'llm',
  'local-llm-port': 'llm',
  'entity-extractor-port': 'ai-pipeline',
  'chunker-port': 'ai-pipeline',
  'document-loader-port': 'ai-pipeline',
  'embedder-port': 'ai-pipeline',
  'query-transformer-port': 'ai-pipeline',
  'reranker-port': 'ai-pipeline',
  'retrieval-port': 'ai-pipeline',
  'tokenizer-port': 'ai-pipeline',
  // workflow
  'task-port': 'workflow',
  'scheduler-port': 'workflow',
  'onboarding-port': 'workflow',
  // messaging
  'event-bus-port': 'messaging',
  // infrastructure
  'seam-port': 'infrastructure',
  // example
  'greeting-port': 'example',
};

function categoryFor(file) {
  const base = path.basename(file).replace(/\.(d\.ts|mjs|cjs|ts|tsx|js|jsx)$/i, '');
  return PORT_CATEGORIES[base] || null;
}

function moduleName(file) {
  const m = toPosix(file).match(/^modules\/([^/]+)\//);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// contractTests discovery
// ---------------------------------------------------------------------------

const CONTRACT_DIR = 'tests/contract';
const contractIndex = new Set(
  fs.existsSync(CONTRACT_DIR) ? fs.readdirSync(CONTRACT_DIR).map((f) => f.toLowerCase()) : [],
);

function contractTestFor(mod) {
  const candidate = `${mod}-hex-contract.test.mjs`;
  return contractIndex.has(candidate.toLowerCase()) ? `${CONTRACT_DIR}/${candidate}` : null;
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

function existingFields(lines, closingIdx) {
  const set = new Set();
  for (let i = 1; i < closingIdx; i++) {
    const m = lines[i].match(/^([a-zA-Z]+):/);
    if (m) set.add(m[1]);
  }
  return set;
}

function fillSidecar(text, file, mod) {
  if (!text.startsWith('---')) return null;
  const lines = text.split('\n');
  const closingIdx = findClosingIndex(lines);
  if (closingIdx === -1) return null;

  const have = existingFields(lines, closingIdx);
  const additions = [];

  if (!have.has('portCategory')) {
    const cat = categoryFor(file);
    if (cat) additions.push(`portCategory: ${cat}`);
  }

  if (!have.has('contractTests')) {
    const ct = contractTestFor(mod);
    if (ct) additions.push(`contractTests: ${ct}`);
  }

  if (additions.length === 0) return null;
  lines.splice(closingIdx, 0, ...additions);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = await collectRepoFiles();
let touched = 0;
let scanned = 0;
const unmatched = [];

for (const file of files) {
  const posix = toPosix(file);
  if (!/^modules\/[^/]+\/ports\/.*-port\.(mjs|cjs|js|ts|d\.ts)$/.test(posix)) continue;

  const mod = moduleName(posix);
  if (!mod) continue;

  const sc = sidecarPath(file);
  let sidecarText;
  try {
    sidecarText = await readText(sc);
  } catch {
    continue;
  }
  scanned++;

  if (!categoryFor(file)) {
    unmatched.push(posix);
  }

  const next = fillSidecar(sidecarText, file, mod);
  if (next && next !== sidecarText) {
    if (DRY_RUN) {
      console.log(`DRY: would update ${sc}`);
    } else {
      await ensureWriteIfChanged(sc, next);
    }
    touched++;
  }
}

console.log(`header-port-fill: scanned ${scanned} port sidecars, ${touched} updated`);
if (unmatched.length > 0) {
  console.log(`unmatched (no portCategory entry):`);
  for (const u of unmatched) console.log(`  ${u}`);
}
