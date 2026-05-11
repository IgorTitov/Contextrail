/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-spawn-variable-fixture in this repository.
 * @sidecar bad-spawn-variable.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: first arg of spawn is a variable, not a literal.
// Cannot be statically audited — must be a literal "git" or use safeGit.
// Expected verdict: violation { pattern: 'spawn-variable' }

import { spawn } from 'node:child_process';

const cmd = 'git';
spawn(cmd, ['status']);
