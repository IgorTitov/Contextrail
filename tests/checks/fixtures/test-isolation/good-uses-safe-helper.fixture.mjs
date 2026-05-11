/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of good-uses-safe-helper-fixture in this repository.
 * @sidecar good-uses-safe-helper.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Good fixture: uses safeGit() from tests/_setup/safe-git.mjs.
// safeGit guarantees both cwd-in-tmpdir and env scrub.
// Expected verdict: pass (no violations).

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeGit } from '../../../_setup/safe-git.mjs';

const dir = mkdtempSync(join(tmpdir(), 'fx-'));
safeGit(dir, 'init', { stdio: 'pipe' });
