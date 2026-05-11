/* @HEADER
 * @version 0.8.2 | 2026-05-10
 * @purpose Ensure meaningful folders contain README.md
 * @sidecar readme-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { parseArgs, resolveScope, result, walk } from './_shared.mjs';
import { FileNotFoundError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const { filter: scopeFilter, isScoped } = resolveScope(args.get('--scope'));

const ROOTS = ['.claude', '.githooks', 'scripts', 'docs', 'tests', 'modules', 'apps', 'packages'];
// Any path segment matching one of these is excluded from the README requirement.
// Segment-based matching handles both leaf dirs (_generated, .scratch) and
// transitive parents (tests/.scratch/header-fix-…/nested).
const IGNORED_SEGMENTS = new Set(['_generated', 'node_modules', 'dist', 'coverage', '.scratch']);

function isIgnoredDir(dir) {
  return dir.split('/').some((seg) => IGNORED_SEGMENTS.has(seg));
}

async function main() {
  const errors = [];
  const dirs = new Set();

  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      const dir = path.dirname(file).replaceAll('\\', '/');
      if (!dir || dir === '.') continue;
      if (isIgnoredDir(dir)) continue;
      dirs.add(dir);
    }
  }

  // When scoped, filter directories to only those within scope prefixes
  const filteredDirs = isScoped ? [...dirs].filter(scopeFilter) : [...dirs];

  for (const dir of filteredDirs.sort()) {
    const readme = `${dir}/README.md`;
    const files = await walk(dir);
    if (files.length === 0) continue;
    if (!files.includes(readme)) {
      errors.push(new FileNotFoundError(`${dir}: missing README.md`, { file: readme }));
    }
  }

  const output = result('readme-check', errors.length === 0, errors, [], {
    folderCount: filteredDirs.length,
    scoped: isScoped,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }
  console.log(`readme-check: ${output.ok ? 'OK' : 'FAIL'}`);
  if (!output.ok) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const output = result('readme-check', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
