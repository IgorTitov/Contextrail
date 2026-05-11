/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Launch Playwright in a cross-platform way with optional headed mode for visible debugging.
 * @sidecar run-e2e.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { spawnSync } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const extraIndex = rawArgs.indexOf('--');
const ownArgs = extraIndex >= 0 ? rawArgs.slice(0, extraIndex) : rawArgs;
const forwarded = extraIndex >= 0 ? rawArgs.slice(extraIndex + 1) : [];

const demo = ownArgs.includes('--demo');
const headed = demo || ownArgs.includes('--headed');
const noCursor = ownArgs.includes('--no-cursor');
const forceCursor = ownArgs.includes('--cursor');
const slowMoIdx = ownArgs.indexOf('--slowmo');
const slowMo = demo ? '500' : slowMoIdx >= 0 ? ownArgs[slowMoIdx + 1] : undefined;

const envOverrides = {};
if (headed) envOverrides.HEADED = '1';
if (slowMo) envOverrides.E2E_SLOWMO = slowMo;
if (noCursor) envOverrides.E2E_CURSOR = '0';
else if (forceCursor) envOverrides.E2E_CURSOR = '1';

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', ...forwarded], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
  env: { ...process.env, ...envOverrides },
});

process.exit(result.status ?? 1);
