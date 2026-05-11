/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-fs-git-write-fixture in this repository.
 * @sidecar bad-fs-git-write.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: direct fs write to a path that targets .git internals.
// Even without spawning git, this corrupts the live repo.
// Expected verdict: violation { pattern: 'fs-git-write' }

import { writeFileSync } from 'node:fs';

writeFileSync('/some/.git/refs/heads/main', 'abc123\n');
