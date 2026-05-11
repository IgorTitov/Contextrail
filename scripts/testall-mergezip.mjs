/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Run test:all and always run mergezip afterwards so artifacts still exist on failures
 * @sidecar testall-mergezip.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { spawnSync } from 'node:child_process';

function hasArg(x) {
  return process.argv.includes(x);
}

function run(cmd, args, quiet) {
  const child = spawnSync(cmd, args, {
    stdio: quiet ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
  });
  return child.status ?? 1;
}

async function main() {
  const quiet = hasArg('--quiet') || hasArg('-q');
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  let exitCode = 0;

  const testCode = run(pnpm, ['test:all'], quiet);
  if (testCode !== 0) exitCode = 1;

  const mergeArgs = ['scripts/mergezip.mjs', '--skip-tests'];
  if (quiet) mergeArgs.push('--quiet');
  const mergeCode = run('node', mergeArgs, quiet);
  if (mergeCode !== 0) exitCode = 1;

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
