/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate that SYSTEM_MAP.md headline numbers match the live repository state.
 * @sidecar system-map-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * SYSTEM_MAP auto-validation.
 * Checks that the module count and maturity breakdown in SYSTEM_MAP.md
 * match the actual modules/ directory and their manifest.json files.
 *
 * Usage: node scripts/checks/system-map-check.mjs
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { result } from './_shared.mjs';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MODULES_DIR = join(ROOT, 'modules');
const SYSTEM_MAP = join(ROOT, 'docs', 'SYSTEM_MAP.md');

const errors = [];
const warnings = [];

// Count actual modules
const moduleDirs = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const moduleCount = moduleDirs.length;

// Count maturity breakdown
let stable = 0;
let beta = 0;
let example = 0;
for (const mod of moduleDirs) {
  const manifestPath = join(MODULES_DIR, mod, 'manifest.json');
  if (!existsSync(manifestPath)) {
    warnings.push(`${mod}: missing manifest.json`);
    continue;
  }
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const maturity = manifest.maturity || 'unknown';
    if (maturity === 'stable') stable++;
    else if (maturity === 'beta') beta++;
    else if (maturity === 'example') example++;
    else warnings.push(`${mod}: unknown maturity "${maturity}"`);
  } catch {
    warnings.push(`${mod}: failed to parse manifest.json`);
  }
}

// Read SYSTEM_MAP headline
const mapText = readFileSync(SYSTEM_MAP, 'utf8');
const headlineMatch = mapText.match(
  /(\d+)\s+hex modules\s*\((\d+)\s+stable\s*·\s*(\d+)\s+beta\s*·\s*(\d+)\s+example\)/,
);

if (!headlineMatch) {
  errors.push('Could not parse module count from SYSTEM_MAP.md headline');
} else {
  const claimed = {
    total: Number(headlineMatch[1]),
    stable: Number(headlineMatch[2]),
    beta: Number(headlineMatch[3]),
    example: Number(headlineMatch[4]),
  };

  if (claimed.total !== moduleCount) {
    errors.push(`SYSTEM_MAP claims ${claimed.total} modules, actual: ${moduleCount}`);
  }
  if (claimed.stable !== stable) {
    errors.push(`SYSTEM_MAP claims ${claimed.stable} stable, actual: ${stable}`);
  }
  if (claimed.beta !== beta) {
    errors.push(`SYSTEM_MAP claims ${claimed.beta} beta, actual: ${beta}`);
  }
  if (claimed.example !== example) {
    errors.push(`SYSTEM_MAP claims ${claimed.example} example, actual: ${example}`);
  }
}

const ok = errors.length === 0;
result('system-map-check', ok, errors, warnings);

if (!ok) {
  for (const e of errors) console.error(`ERROR: ${e}`);
}
for (const w of warnings) console.warn(`WARN: ${w}`);

if (!ok) process.exit(1);
else console.log('system-map-check: OK');
