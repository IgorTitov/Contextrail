/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-cwd-process-cwd-fixture in this repository.
 * @sidecar bad-cwd-process-cwd.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: cwd: process.cwd() — definitely not tmpdir.
// Expected verdict: violation { pattern: 'cwd-non-tmpdir' }

import { execSync } from 'node:child_process';

export function run() {
  return execSync('git rev-parse HEAD', { cwd: process.cwd() });
}
