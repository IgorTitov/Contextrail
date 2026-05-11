/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-helper in this repository.
 * @sidecar bad-helper.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad helper: imported by bad-helper-import.fixture.mjs.
// Demonstrates the transitive-scan invariant — the fixture file
// itself looks innocent, but it imports this helper which hides the
// bad pattern. The static check follows imports one hop.
// Expected: scanned because fixture imports it; pattern 'no-cwd' fires.

import { execSync } from 'node:child_process';

export function readGitStatus() {
  return execSync('git status --porcelain');
}
