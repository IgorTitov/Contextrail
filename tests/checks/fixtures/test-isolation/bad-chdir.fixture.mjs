/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-chdir-fixture in this repository.
 * @sidecar bad-chdir.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: process.chdir followed by git invocation.
// Even if cwd were correct after the chdir, chdir alone is banned.
// Expected verdict: violation { pattern: 'process-chdir' }

import { execSync } from 'node:child_process';

export function run(somewhere) {
  process.chdir(somewhere);
  return execSync('git status');
}
