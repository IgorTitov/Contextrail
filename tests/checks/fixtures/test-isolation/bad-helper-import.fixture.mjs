/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-helper-import-fixture in this repository.
 * @sidecar bad-helper-import.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: looks innocent on its own but imports bad-helper.mjs
// which contains the violation. The static check's transitive scan
// must follow the import.
// Expected verdict: violation surfaces in bad-helper.mjs.

import { readGitStatus } from './bad-helper.mjs';

export function run() {
  return readGitStatus();
}
