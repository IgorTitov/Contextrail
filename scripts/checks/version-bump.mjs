/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bump the repository patch version in package.json and mirror the same value into VERSION.
 * @sidecar version-bump.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { existsSync } from 'node:fs';
import { ensureWriteIfChanged, parseArgs, readText, result } from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const checkOnly = args.has('--check');

function bump(version) {
  const [maj, min, patch] = String(version)
    .trim()
    .split('.')
    .map((x) => Number(x || 0));
  return `${maj}.${min}.${patch + 1}`;
}

async function readCurrentVersion() {
  if (existsSync('package.json')) {
    const pkg = JSON.parse(await readText('package.json'));
    if (typeof pkg.version === 'string' && pkg.version.trim()) {
      return pkg.version.trim();
    }
  }

  if (existsSync('VERSION')) {
    return (await readText('VERSION')).trim().split(/\r?\n/).at(-1).trim();
  }

  return '0.1.0';
}

async function main() {
  const currentVersion = await readCurrentVersion();
  const nextVersion = bump(currentVersion);

  if (checkOnly) {
    const output = result('version-bump', true, [], [], {
      currentVersion,
      nextVersion,
      changed: false,
    });
    if (wantJson) console.log(JSON.stringify(output, null, 2));
    else console.log(`${currentVersion} -> ${nextVersion}`);
    return;
  }

  const changedFiles = [];

  if (existsSync('package.json')) {
    const pkg = JSON.parse(await readText('package.json'));
    pkg.version = nextVersion;
    await ensureWriteIfChanged('package.json', JSON.stringify(pkg, null, 2) + '\n');
    changedFiles.push('package.json');
  }

  await ensureWriteIfChanged('VERSION', `${nextVersion}\n`);
  changedFiles.push('VERSION');

  const output = result('version-bump', true, [], [], {
    currentVersion,
    nextVersion,
    changedFiles,
  });

  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.log(`version bumped ${currentVersion} -> ${nextVersion}`);
}

main().catch((error) => {
  const output = result('version-bump', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
