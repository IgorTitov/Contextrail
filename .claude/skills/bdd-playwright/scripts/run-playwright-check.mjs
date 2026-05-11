/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Run the first available Playwright-compatible repository script so the bdd-playwright skill can verify visible behavior with minimal local logic.
 * @sidecar run-playwright-check.mjs.header.md
 * @layer control-plane | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
const candidates = ['test:e2e:smoke', 'test:e2e', 'e2e'];

for (const name of candidates) {
  if (scripts[name]) {
    const bin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const result = spawnSync(bin, ['run', name], { stdio: 'inherit', shell: false });
    process.exit(result.status ?? 1);
  }
}

console.log('No Playwright-compatible script found. Expected one of: test:e2e:smoke, test:e2e, e2e');
