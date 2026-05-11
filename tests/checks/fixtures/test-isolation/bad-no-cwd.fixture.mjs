/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-no-cwd-fixture in this repository.
 * @sidecar bad-no-cwd.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: execSync('git ...') with NO options at all.
// Expected verdict: violation { pattern: 'no-cwd' }

import { execSync } from 'node:child_process';

export function run() {
  return execSync('git status --porcelain');
}
