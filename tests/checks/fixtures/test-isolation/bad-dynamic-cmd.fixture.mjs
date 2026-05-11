/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-dynamic-cmd-fixture in this repository.
 * @sidecar bad-dynamic-cmd.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: string-concatenation obfuscation of the command.
// 'gi' + 't status' avoids a literal "git" but reaches the same effect.
// Expected verdict: violation { pattern: 'dynamic-cmd' }

import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'fx-'));
execSync('gi' + 't status', { cwd: dir, env: { GIT_DIR: '' } });
