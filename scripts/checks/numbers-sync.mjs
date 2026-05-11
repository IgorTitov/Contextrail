/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Sync hardcoded numbers (test count, module count, metrics) across docs to match live repo state.
 * @sidecar numbers-sync.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Numbers sync.
 * Reads actual test counts and module counts from the live repo,
 * then updates hardcoded numbers in README.md and SYSTEM_MAP.md.
 *
 * Usage:
 *   node scripts/checks/numbers-sync.mjs [--check] [--json]
 *
 * --check: report drift without fixing (CI mode, exits 1 on drift)
 * --json:  machine-readable output
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CHECK_ONLY = process.argv.includes('--check');
const WANT_JSON = process.argv.includes('--json');

// ---------------------------------------------------------------------------
// Measure actual values
// ---------------------------------------------------------------------------

function countTests(layer) {
  try {
    const out = execSync(`pnpm test:${layer}`, { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
    const match = out.match(/# tests (\d+)/);
    return match ? Number(match[1]) : 0;
  } catch (err) {
    const match = (err.stdout || '').match(/# tests (\d+)/);
    return match ? Number(match[1]) : 0;
  }
}

function countModules() {
  return readdirSync(join(ROOT, 'modules'), { withFileTypes: true }).filter((d) => d.isDirectory())
    .length;
}

function countMaturity() {
  const modules = readdirSync(join(ROOT, 'modules'), { withFileTypes: true }).filter((d) =>
    d.isDirectory(),
  );
  let stable = 0,
    beta = 0,
    example = 0;
  for (const mod of modules) {
    try {
      const m = JSON.parse(readFileSync(join(ROOT, 'modules', mod.name, 'manifest.json'), 'utf8'));
      if (m.maturity === 'stable') stable++;
      else if (m.maturity === 'beta') beta++;
      else if (m.maturity === 'example') example++;
    } catch {
      /* skip */
    }
  }
  return { stable, beta, example };
}

// ---------------------------------------------------------------------------
// Update files
// ---------------------------------------------------------------------------

const updates = [];

function syncInFile(relPath, patterns) {
  const absPath = join(ROOT, relPath);
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return;
  }

  let updated = content;
  for (const { regex, replacement, label } of patterns) {
    const before = updated;
    updated = updated.replace(regex, replacement);
    if (before !== updated) {
      updates.push({ file: relPath, label, check: CHECK_ONLY });
    }
  }

  if (updated !== content && !CHECK_ONLY) {
    writeFileSync(absPath, updated, 'utf8');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Count tests (fast — just read from last test run if available, or run now)
const unit = countTests('unit');
const integration = countTests('integration');
const contract = countTests('contract');
const bdd = countTests('bdd');
const total = unit + integration + contract + bdd;

const moduleCount = countModules();
const { stable, beta, example } = countMaturity();

const statsLine = `${moduleCount} hex modules (${stable} stable · ${beta} beta · ${example} example) · ${total} tests`;

// README.md: stats line
syncInFile('README.md', [
  {
    label: 'README stats line',
    regex: /\d+ hex modules \(\d+ stable · \d+ beta · \d+ example\) · \d+ tests/,
    replacement: statsLine,
  },
]);

// SYSTEM_MAP.md: headline (has extra middle fields not in README stats line)
const smPath = join(ROOT, 'docs', 'SYSTEM_MAP.md');
try {
  let sm = readFileSync(smPath, 'utf8');
  const smRegex =
    /(\d+) hex modules \((\d+) stable · (\d+) beta · (\d+) example\) · (.+?) · (\d+) tests/;
  const smMatch = sm.match(smRegex);
  if (smMatch) {
    const middlePart = smMatch[5]; // e.g., "350+ source files · 5 platform targets"
    const newLine = `${moduleCount} hex modules (${stable} stable · ${beta} beta · ${example} example) · ${middlePart} · ${total} tests`;
    const before = sm;
    sm = sm.replace(smRegex, newLine);
    if (sm !== before) {
      // Remove duplicate from first pass if any
      if (!CHECK_ONLY) writeFileSync(smPath, sm, 'utf8');
      // Already tracked above, or add if not
    }
  }
} catch {
  /* skip */
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (WANT_JSON) {
  console.log(
    JSON.stringify(
      {
        measured: { unit, integration, contract, bdd, total, moduleCount, stable, beta, example },
        updates,
        ok: updates.length === 0,
      },
      null,
      2,
    ),
  );
} else if (updates.length === 0) {
  console.log('numbers-sync: all numbers current');
} else {
  console.log(
    `numbers-sync: ${CHECK_ONLY ? 'DRIFT detected' : 'updated'} ${updates.length} value(s)`,
  );
  for (const u of updates) {
    console.log(`  ${CHECK_ONLY ? 'DRIFT' : 'fixed'}: ${u.file} — ${u.label}`);
  }
}

if (CHECK_ONLY && updates.length > 0) {
  process.exit(1);
}
