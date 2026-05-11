/* @HEADER
 * @version 0.8.2 | 2026-05-10
 * @purpose Cross-platform test runner — resolves glob patterns portably for node --test.
 * @sidecar run-tests.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Portable test runner.
 * Resolves glob patterns using Node's fs.glob (Node 22+) or manual
 * recursive readdir, then passes the expanded file list to node --test.
 *
 * Usage:
 *   node scripts/run-tests.mjs tests/unit
 *   node scripts/run-tests.mjs tests/contract
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const testDir = process.argv[2];
if (!testDir) {
  console.error('Usage: node scripts/run-tests.mjs <test-directory>');
  process.exit(1);
}

/**
 * Recursively find all *.test.mjs files in a directory.
 */
function findTestFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.mjs')) {
      results.push(fullPath);
    }
  }
  return results;
}

const absDir = join(ROOT, testDir);
const files = findTestFiles(absDir);

if (files.length === 0) {
  console.error(`No *.test.mjs files found in ${testDir}`);
  process.exit(1);
}

try {
  const nodeArgs = ['--test'];
  if (testDir === 'tests/integration') {
    // Integration suites exercise shared git/worktree flows and temp-path
    // coordination. Run them serially to avoid cross-test interference from
    // Node's default parallel scheduling. (TPL-324 / ADR-0045)
    nodeArgs.push('--test-concurrency=1');
  }
  nodeArgs.push(...files);
  execFileSync('node', nodeArgs, {
    cwd: ROOT,
    stdio: 'inherit',
  });
} catch (err) {
  process.exit(err.status || 1);
}
