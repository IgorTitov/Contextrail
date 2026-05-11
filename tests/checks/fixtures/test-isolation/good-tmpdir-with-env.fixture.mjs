/* @HEADER
 * @version 0.7.81 | 2026-05-04
 * @purpose Describe the role of good-tmpdir-with-env-fixture in this repository.
 * @sidecar good-tmpdir-with-env.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Good fixture: git invocation through safeGit() — tmpdir cwd, env scrubbed.
// TPL-272: the old inline pattern (execSync with explicit cwd+env) was
// reclassified as bad-raw-exec-with-safe-env.fixture.mjs.
// Expected verdict: pass (no violations).

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeGit } from '../../../_setup/safe-git.mjs';

const dir = mkdtempSync(join(tmpdir(), 'fx-'));
safeGit(dir, 'init', { stdio: 'pipe' });
