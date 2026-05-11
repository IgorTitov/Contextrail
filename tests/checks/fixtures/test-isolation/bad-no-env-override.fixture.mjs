/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-no-env-override-fixture in this repository.
 * @sidecar bad-no-env-override.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: THE Zvenix bug. cwd is mkdtemp-derived (correct!), but
// env is not scrubbed of GIT_DIR / GIT_WORK_TREE. A poisoned parent
// shell still routes the call to the live repo.
// Expected verdict: violation { pattern: 'no-env-override' }

import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'fx-'));
execSync('git init', { cwd: dir, stdio: 'pipe' });
