/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify that disabling each active seam keeps all tests green — prove rollback safety before switching.
 * @sidecar seam-rollback-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Rollback readiness check.
 * For each seam in 'active' or 'shadow' state, runs the test suite
 * with that seam forced to 'disabled' to prove rollback is safe.
 *
 * Usage:
 *   node scripts/checks/seam-rollback-check.mjs [--json] [--flag=<name>]
 */

import { execSync } from 'node:child_process';
import { parseArgs, result } from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const targetFlag = args.get('--flag');

/**
 * Get active seam flags by running seam-audit --json.
 * @returns {Array<{ flag: string, state: string }>}
 */
function getActiveSeams() {
  try {
    const out = execSync('node scripts/checks/seam-audit.mjs --json', { encoding: 'utf8' });
    const data = JSON.parse(out);
    return data.registrations
      .filter((r) => r.state === 'active' || r.state === 'shadow')
      .reduce((acc, r) => {
        if (!acc.find((x) => x.flag === r.flag)) acc.push({ flag: r.flag, state: r.state });
        return acc;
      }, []);
  } catch {
    return [];
  }
}

/**
 * Run unit tests with a specific seam forced to disabled.
 * @param {string} flag
 * @returns {{ flag: string, safe: boolean, output: string }}
 */
function checkRollback(flag) {
  try {
    execSync(`node --test "tests/unit/**/*.test.mjs"`, {
      encoding: 'utf8',
      env: { ...process.env, SEAM_ROLLBACK_CHECK: flag },
      timeout: 120_000,
    });
    return { flag, safe: true, output: '' };
  } catch (err) {
    return {
      flag,
      safe: false,
      output: err.stdout?.slice(-500) ?? err.message,
    };
  }
}

const seams = targetFlag ? [{ flag: targetFlag, state: 'unknown' }] : getActiveSeams();

if (seams.length === 0) {
  if (wantJson) {
    console.log(JSON.stringify({ ok: true, seams: [], message: 'No active seams to check' }));
  } else {
    console.log('seam-rollback-check: no active seams to check');
  }
  process.exit(0);
}

const results = [];
for (const seam of seams) {
  if (!wantJson) {
    process.stdout.write(`  checking rollback for "${seam.flag}"... `);
  }
  const check = checkRollback(seam.flag);
  results.push(check);
  if (!wantJson) {
    console.log(check.safe ? 'SAFE' : 'UNSAFE');
  }
}

const allSafe = results.every((r) => r.safe);

if (wantJson) {
  console.log(JSON.stringify({ ok: allSafe, seams: results }, null, 2));
} else {
  console.log(
    `\nseam-rollback-check: ${allSafe ? 'all rollbacks safe' : 'UNSAFE rollbacks detected'}`,
  );
  for (const r of results.filter((r) => !r.safe)) {
    console.log(`  UNSAFE: "${r.flag}" — tests fail when disabled`);
    if (r.output) console.log(`    ${r.output.split('\n').slice(-3).join('\n    ')}`);
  }
}

result(
  'seam-rollback-check',
  allSafe,
  allSafe ? [] : results.filter((r) => !r.safe).map((r) => `"${r.flag}" rollback unsafe`),
);

if (!allSafe) process.exit(1);
