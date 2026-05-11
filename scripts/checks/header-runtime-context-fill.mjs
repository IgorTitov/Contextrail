/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Backfill runtimeEnvironment and externalSystems on adapter sidecars by scanning source for runtime-specific globals and external boundaries.
 * @sidecar header-runtime-context-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Two deterministic fields are filled for every
 * `modules/<mod>/adapters/*-adapter.{mjs,cjs,js,ts}` source:
 *
 *   1. runtimeEnvironment — one of `browser`, `node`, or `universal`.
 *      Detected from `node:*` imports (or `require('fs')`-style) and from
 *      browser globals like `indexedDB`, `localStorage`, `document`,
 *      `navigator`, `Worker`. When neither set fires the adapter is treated
 *      as universal (the default for stub/in-memory adapters).
 *
 *   2. externalSystems — a curated list of identifiable boundaries the
 *      adapter actually crosses (`http`, `browser-localstorage`,
 *      `browser-indexeddb`, `node-fs`, `web-worker`, `dom`, `console`).
 *      A keyword-driven detector — no semantic guessing.
 *
 * Domain, port, application, and public-api files are intentionally skipped:
 * they are runtime-agnostic by hex layer rule (architecture.md), and adding
 * the field there would just duplicate that policy in metadata.
 *
 * Idempotent — re-running rewrites the same values, but only when they
 * actually changed (so the field tracks the source automatically).
 *
 * Usage: node scripts/checks/header-runtime-context-fill.mjs [--dry-run]
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
// Detectors
// ---------------------------------------------------------------------------

const NODE_HINTS = [
  /from\s+['"]node:[a-z]+/,
  /require\(['"]node:[a-z]+/,
  /import\(['"]node:[a-z]+/,
  /from\s+['"]fs(?:\/promises)?['"]/,
  /from\s+['"]path['"]/,
  /from\s+['"]child_process['"]/,
  /process\.versions\.node/,
];

const BROWSER_HINTS = [
  /\bindexedDB\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bdocument\.[a-z]/i,
  /\bnavigator\.[a-z]/i,
  /\bwindow\.[a-z]/i,
  /\bnew\s+Worker\s*\(/,
  /\bnew\s+Notification\s*\(/,
  /\bIDBDatabase\b/,
];

function detectRuntime(source) {
  const node = NODE_HINTS.some((re) => re.test(source));
  const browser = BROWSER_HINTS.some((re) => re.test(source));
  if (node && browser) return 'universal';
  if (node) return 'node';
  if (browser) return 'browser';
  return 'universal';
}

// Each detector is { tag, re } so the resulting list stays curated and
// human-readable rather than regex-soup leaking into sidecars.
const EXTERNAL_DETECTORS = [
  { tag: 'http', re: /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b/ },
  { tag: 'websocket', re: /\bWebSocket\b/ },
  { tag: 'browser-localstorage', re: /\blocalStorage\b/ },
  { tag: 'browser-sessionstorage', re: /\bsessionStorage\b/ },
  { tag: 'browser-indexeddb', re: /\bindexedDB\b|\bIDBDatabase\b/ },
  {
    tag: 'node-fs',
    re: /from\s+['"]node:fs|require\(['"]node:fs|import\(['"]node:fs|from\s+['"]fs(?:\/promises)?['"]/,
  },
  {
    tag: 'node-child-process',
    re: /from\s+['"]node:child_process|require\(['"]node:child_process|import\(['"]node:child_process/,
  },
  { tag: 'web-worker', re: /\bnew\s+Worker\s*\(/ },
  { tag: 'dom', re: /\bdocument\.(createElement|getElementById|querySelector)/ },
  { tag: 'console', re: /\bconsole\.(log|info|warn|error|debug)\b/ },
  { tag: 'browser-notification', re: /\bnew\s+Notification\s*\(/ },
];

function detectExternalSystems(source) {
  return EXTERNAL_DETECTORS.filter((d) => d.re.test(source))
    .map((d) => d.tag)
    .sort((a, b) => a.localeCompare(b));
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

function stripBlock(lines, closingIdx, fieldName) {
  const out = [];
  let skipping = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i > 0 && i < closingIdx) {
      if (new RegExp(`^${fieldName}:\\s*$`).test(line)) {
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
  return out;
}

function stripScalar(lines, closingIdx, fieldName) {
  return lines.filter((line, i) => {
    if (i === 0 || i >= closingIdx) return true;
    return !new RegExp(`^${fieldName}:\\s+`).test(line);
  });
}

function rewriteSidecar(text, runtime, externalSystems) {
  if (!text.startsWith('---')) return null;
  let lines = text.split('\n');
  let closingIdx = findClosingIndex(lines);
  if (closingIdx === -1) return null;

  // Strip prior values so the script stays the source of truth.
  lines = stripScalar(lines, closingIdx, 'runtimeEnvironment');
  closingIdx = findClosingIndex(lines);
  lines = stripBlock(lines, closingIdx, 'externalSystems');
  closingIdx = findClosingIndex(lines);

  const additions = [`runtimeEnvironment: ${runtime}`];
  if (externalSystems.length > 0) {
    additions.push('externalSystems:', ...externalSystems.map((e) => `  - ${e}`));
  }

  lines.splice(closingIdx, 0, ...additions);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ADAPTER_RE = /^modules\/[^/]+\/adapters\/.*-adapter\.(mjs|cjs|js|ts)$/;

const files = await collectRepoFiles();
let scanned = 0;
let touched = 0;
const runtimeCounts = { browser: 0, node: 0, universal: 0 };

for (const file of files) {
  const posix = toPosix(file);
  if (!ADAPTER_RE.test(posix)) continue;
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

  const runtime = detectRuntime(source);
  const externals = detectExternalSystems(source);
  runtimeCounts[runtime]++;

  const next = rewriteSidecar(sidecarText, runtime, externals);
  if (!next || next === sidecarText) continue;

  if (DRY_RUN) {
    console.log(
      `DRY: would set runtime=${runtime} externals=[${externals.join(',')}] on ${path.basename(sc)}`,
    );
  } else {
    await ensureWriteIfChanged(sc, next);
  }
  touched++;
}

console.log(
  `header-runtime-context-fill: scanned ${scanned} adapters, ${touched} updated ` +
    `(browser=${runtimeCounts.browser}, node=${runtimeCounts.node}, universal=${runtimeCounts.universal})`,
);
