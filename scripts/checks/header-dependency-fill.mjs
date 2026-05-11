/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Batch fill machine-verifiable dependency fields (allowedDependencies, forbiddenDependencies, adapterType) on module sidecars based on hex layer and adapter naming.
 * @sidecar header-dependency-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Per-layer dependency rules come from scripts/checks/architecture-check.mjs:
 * - domain/application: no adapters, no DI, no frameworks, no node: builtins, no other modules
 * - ports: no adapters, no frameworks, no node: builtins, no other modules
 * - adapters: may use frameworks + node: builtins; must not reach into other modules internals
 * - public-api: re-exports own module only; no cross-module deep imports
 *
 * adapterType is derived from the adapter filename using well-known patterns.
 *
 * Usage: node scripts/checks/header-dependency-fill.mjs [--dry-run]
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
    name + ': repo-wide run requires --scope=<dir> or --dry-run.\n' +
    "Running without scope in a parallel session can overwrite other sessions' files.\n" +
    'Use: node scripts/checks/' + name + ' --scope=modules/my-module',
  );
  process.exit(1);
}


// ---------------------------------------------------------------------------
// Layer detection (mirrors architecture-check.mjs)
// ---------------------------------------------------------------------------

function moduleName(file) {
  const m = toPosix(file).match(/^modules\/([^/]+)\//);
  return m ? m[1] : null;
}

function layerOf(file) {
  const p = toPosix(file);
  if (/^modules\/[^/]+\/public-api\.[cm]?[jt]sx?$/.test(p)) return 'public-api';
  if (p.includes('/domain/')) return 'domain';
  if (p.includes('/application/')) return 'application';
  if (p.includes('/ports/')) return 'ports';
  if (p.includes('/adapters/')) return 'adapters';
  if (p.includes('/di/')) return 'di';
  return null;
}

// ---------------------------------------------------------------------------
// Canonical dependency rule tables
// ---------------------------------------------------------------------------

function rulesForLayer(layer) {
  switch (layer) {
    case 'public-api':
      return {
        allowedDependencies: [
          `./domain/*`,
          `./application/*`,
          `./ports/*`,
          `./adapters/*`,
          `./messages.*`,
          `./types.*`,
        ],
        forbiddenDependencies: [
          `modules/<other>/domain/**`,
          `modules/<other>/application/**`,
          `modules/<other>/ports/**`,
          `modules/<other>/adapters/**`,
          `react`,
          `express`,
          `fastify`,
          `node:*`,
        ],
      };
    case 'domain':
      return {
        allowedDependencies: [
          `./` /* sibling domain files in same module */,
          `../ports/*`,
          `../types.*`,
        ],
        forbiddenDependencies: [
          `../adapters/**`,
          `../di/**`,
          `react`,
          `next`,
          `electron`,
          `express`,
          `fastify`,
          `vite`,
          `node:*`,
          `fs`,
          `path`,
          `modules/<other>/**`,
        ],
      };
    case 'application':
      return {
        allowedDependencies: [`./`, `../domain/*`, `../ports/*`, `../types.*`],
        forbiddenDependencies: [
          `../adapters/**`,
          `../di/**`,
          `react`,
          `next`,
          `electron`,
          `express`,
          `fastify`,
          `vite`,
          `node:*`,
          `fs`,
          `path`,
          `modules/<other>/**`,
        ],
      };
    case 'ports':
      return {
        allowedDependencies: [`./` /* type-only sibling imports */, `../types.*`],
        forbiddenDependencies: [
          `../adapters/**`,
          `../di/**`,
          `react`,
          `express`,
          `fastify`,
          `node:*`,
          `fs`,
          `path`,
          `modules/<other>/**`,
        ],
      };
    case 'adapters':
      return {
        allowedDependencies: [
          `../ports/*`,
          `../types.*`,
          `./` /* sibling adapter helpers in same module */,
          `frameworks as needed (react, express, node: builtins)`,
        ],
        forbiddenDependencies: [
          `../domain/**` /* go through ports instead */,
          `../application/**`,
          `modules/<other>/domain/**`,
          `modules/<other>/application/**`,
          `modules/<other>/adapters/**`,
        ],
      };
    case 'di':
      return {
        allowedDependencies: [`../ports/*`, `../adapters/*`, `../public-api.*`],
        forbiddenDependencies: [`../domain/**`, `../application/**`, `modules/<other>/**`],
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// adapterType classification
// ---------------------------------------------------------------------------

function classifyAdapter(file) {
  const base = path.basename(file, path.extname(file)).toLowerCase();
  // Order matters — most specific first.
  if (/(^|-)no-?op(-|$)|(^|-)noop(-|$)/.test(base)) return 'test-stub';
  if (/(^|-)echo(-|$)|(^|-)fake(-|$)|(^|-)stub(-|$)|(^|-)mock(-|$)/.test(base)) return 'test-stub';
  if (/(^|-)memory(-|$)|in-?memory|(^|-)lru(-|$)/.test(base)) return 'in-memory';
  if (
    /indexeddb|localstorage|local-storage|session-storage|sqlite|redis|postgres|mongo/.test(base)
  ) {
    return 'storage';
  }
  if (/(^|-)http(-|$)|fetch|websocket|(^|-)ws(-|$)|sse|grpc/.test(base)) return 'network';
  if (/jwt|oauth|session|password|anonymous|credential/.test(base)) return 'credential';
  if (/console|logger|winston|pino/.test(base)) return 'logging';
  if (/browser|dom|canvas/.test(base)) return 'ui';
  if (/behavioral|tracker|analytics/.test(base)) return 'telemetry';
  return 'infrastructure';
}

// ---------------------------------------------------------------------------
// YAML writers
// ---------------------------------------------------------------------------

function yamlQuote(val) {
  if (/[:#{}[\]|>&*!,?'"]/.test(val) || val.startsWith('@') || val.startsWith('`')) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

function renderListField(name, items) {
  const out = [`${name}:`];
  for (const item of items) out.push(`  - ${yamlQuote(item)}`);
  return out;
}

// ---------------------------------------------------------------------------
// Sidecar mutation
// ---------------------------------------------------------------------------

function parseExistingFields(lines, closingIdx) {
  const existing = new Set();
  for (let i = 1; i < closingIdx; i++) {
    const m = lines[i].match(/^([a-zA-Z]+):/);
    if (m) existing.add(m[1]);
  }
  return existing;
}

function fillSidecar(sidecarText, layer, file) {
  if (!sidecarText.startsWith('---')) return null;
  const lines = sidecarText.split('\n');
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIdx = i;
      break;
    }
  }
  if (closingIdx === -1) return null;

  const existing = parseExistingFields(lines, closingIdx);
  const rules = rulesForLayer(layer);
  if (!rules) return null;

  const additions = [];

  if (!existing.has('allowedDependencies')) {
    additions.push(...renderListField('allowedDependencies', rules.allowedDependencies));
  }
  if (!existing.has('forbiddenDependencies')) {
    additions.push(...renderListField('forbiddenDependencies', rules.forbiddenDependencies));
  }
  if (layer === 'adapters' && !existing.has('adapterType')) {
    additions.push(`adapterType: ${classifyAdapter(file)}`);
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

for (const file of files) {
  const posix = toPosix(file);
  if (!posix.startsWith('modules/')) continue;
  // Only code files carry dependency rules — skip READMEs, manifests, .md docs.
  if (!/\.(mjs|cjs|js|jsx|ts|tsx|d\.ts)$/.test(posix)) continue;
  const layer = layerOf(posix);
  if (!layer) continue;
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

  const next = fillSidecar(sidecarText, layer, file);
  if (next && next !== sidecarText) {
    if (DRY_RUN) {
      console.log(`DRY: would update ${sc}`);
    } else {
      await ensureWriteIfChanged(sc, next);
    }
    touched++;
  }
}

console.log(`header-dependency-fill: scanned ${scanned} sidecars, ${touched} updated`);
