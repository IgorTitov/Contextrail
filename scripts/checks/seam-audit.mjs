/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Implement the seam-audit repository script.
 * @sidecar seam-audit.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Seam audit script.
 * Finds all feature seam registrations in the codebase and reports their state.
 * Warns about stale or orphaned seams.
 *
 * Usage:
 *   node scripts/checks/seam-audit.mjs [--json]
 *
 * SpecRefs: TPL-042
 */

import { readText, result, walk } from './_shared.mjs';

const wantJson = process.argv.includes('--json');
const strict = process.argv.includes('--strict');

/**
 * Naming convention: <module>.<behavior> in kebab-case.
 * Examples: auth.argon2-migration, ui.dark-mode-v2
 * Test-only flags (starting with "feat-", "test-") are exempt.
 */
const NAMING_RE = /^[a-z][a-z0-9]*\.[a-z][a-z0-9-]*$/;
const TEST_FLAG_RE = /^(feat$|feat-|test-|__)/;

/**
 * Extract seam registrations from source code.
 * Matches patterns like: register('flag-name', { state: 'active', owner: 'team' })
 * and createConfigSeamAdapter({ 'flag-name': { state: 'active', owner: 'team' } })
 */
function extractSeamRegistrations(filePath, text) {
  const results = [];

  // Pattern 1: adapter.register('flag', { state: '...' | SEAM_STATES.X, owner: '...' })
  const registerRe =
    /\.register\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*state\s*:\s*(?:['"](\w+)['"]|SEAM_STATES\.(\w+))[^}]*owner\s*:\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(registerRe)) {
    results.push({
      flag: match[1],
      state: (match[2] || match[3] || 'unknown').toLowerCase(),
      owner: match[4],
      file: filePath,
      type: 'register',
    });
  }

  // Pattern 2: config object keys { 'flag': { state: '...', owner: '...' } }
  const configRe =
    /['"]([a-z][\w-]*)['"]:\s*\{\s*state\s*:\s*['"](\w+)['"][^}]*owner\s*:\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(configRe)) {
    results.push({
      flag: match[1],
      state: match[2],
      owner: match[3],
      file: filePath,
      type: 'config',
    });
  }

  return results;
}

/**
 * Extract seam usage from source code.
 * Matches patterns like: whenEnabled(adapter, 'flag', ...) and ifEnabled(adapter, 'flag', ...)
 * and adapter.isEnabled('flag')
 */
function extractSeamUsage(filePath, text) {
  const results = [];

  const guardRe = /(?:whenEnabled|whenShadow|ifEnabled)\(\s*\w+\s*,\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(guardRe)) {
    results.push({ flag: match[1], file: filePath });
  }

  const isEnabledRe = /\.isEnabled\(\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(isEnabledRe)) {
    results.push({ flag: match[1], file: filePath });
  }

  return results;
}

async function main() {
  const registrations = [];
  const usages = [];
  const warnings = [];

  const files = await walk('.');
  for (const filePath of files) {
    if (!filePath.endsWith('.mjs') && !filePath.endsWith('.js')) continue;
    if (filePath.includes('seam-audit')) continue;

    const text = await readText(filePath);
    if (!text) continue;

    registrations.push(...extractSeamRegistrations(filePath, text));
    usages.push(...extractSeamUsage(filePath, text));
  }

  // Deduplicate registrations by flag
  const registeredFlags = new Map();
  for (const reg of registrations) {
    if (!registeredFlags.has(reg.flag)) {
      registeredFlags.set(reg.flag, []);
    }
    registeredFlags.get(reg.flag).push(reg);
  }

  // Deduplicate usages by flag
  const usedFlags = new Map();
  for (const usage of usages) {
    if (!usedFlags.has(usage.flag)) {
      usedFlags.set(usage.flag, []);
    }
    usedFlags.get(usage.flag).push(usage);
  }

  // Check for orphaned seams (registered but never used)
  for (const [flag, regs] of registeredFlags) {
    if (!usedFlags.has(flag)) {
      warnings.push({
        type: 'orphaned',
        flag,
        message: `Seam "${flag}" is registered but never used in guard calls`,
        locations: regs.map((r) => r.file),
      });
    }
  }

  // Check for ghost usages (used but never registered)
  for (const [flag, uses] of usedFlags) {
    if (!registeredFlags.has(flag)) {
      warnings.push({
        type: 'ghost',
        flag,
        message: `Seam "${flag}" is used in guards but never registered`,
        locations: uses.map((u) => u.file),
      });
    }
  }

  // Check naming convention (skip test-only flags)
  for (const [flag, regs] of registeredFlags) {
    if (TEST_FLAG_RE.test(flag)) continue;
    if (!NAMING_RE.test(flag)) {
      warnings.push({
        type: 'naming',
        flag,
        message: `Seam "${flag}" does not follow naming convention <module>.<behavior> (kebab-case)`,
        locations: regs.map((r) => r.file),
      });
    }
  }

  if (wantJson) {
    console.log(
      JSON.stringify({ registrations, usages: [...usedFlags.keys()], warnings }, null, 2),
    );
  } else {
    console.log(
      `seam-audit: found ${registeredFlags.size} registered seam(s), ${usedFlags.size} used flag(s)`,
    );
    for (const [flag, regs] of registeredFlags) {
      for (const reg of regs) {
        console.log(`  [${reg.state}] ${flag} — owner: ${reg.owner} (${reg.file})`);
      }
    }
    if (warnings.length > 0) {
      console.log('');
      for (const w of warnings) {
        console.log(`  WARN: ${w.message}`);
        for (const loc of w.locations) {
          console.log(`    -> ${loc}`);
        }
      }
    }
  }

  const ok = warnings.length === 0;
  result(
    'seam-audit',
    ok,
    [],
    warnings.map((w) => w.message),
  );

  if (strict && !ok) {
    process.exit(1);
  }
}

main();
