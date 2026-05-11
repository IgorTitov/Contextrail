/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Point git core.hooksPath to the repository-local .githooks directory and verify critical safety invariants.
 * @sidecar install-hooks.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const child = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
if (child.status !== 0) process.exit(child.status ?? 1);

// Safety invariant check: pre-commit must have ORIG_STAGED snapshot
// Without it, `git add -u` in pre-commit captures parallel sessions' WIP changes.
try {
  const hook = readFileSync(join(ROOT, '.githooks', 'pre-commit'), 'utf8');
  if (!hook.includes('ORIG_STAGED')) {
    console.error(
      '\n⚠️  WARNING: .githooks/pre-commit is missing ORIG_STAGED snapshot.\n' +
      '   This means parallel Claude sessions will overwrite each other\'s work.\n' +
      '   Update pre-commit from the Contextrail template (v0.6.7+).\n',
    );
  }
} catch { /* pre-commit doesn't exist yet — OK for fresh repos */ }

console.log('Git hooks installed: .githooks/');
