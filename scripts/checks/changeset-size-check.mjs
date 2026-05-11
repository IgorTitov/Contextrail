/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Warn or fail when the current staged changeset is unusually large for a single bounded slice.
 * @sidecar changeset-size-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { spawnSync } from 'node:child_process';
import { parseArgs, result } from './_shared.mjs';
import { ValidationError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const strict = args.has('--strict');

const FILE_LIMIT = 12;
const LINE_LIMIT = 400;

function git(args) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function main() {
  const filesOut = git(['diff', '--cached', '--name-only']);
  const statOut = git(['diff', '--cached', '--shortstat']);

  const files = String(filesOut.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const shortstat = String(statOut.stdout || '').trim();
  const match = shortstat.match(
    /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
  );
  const changedFileCount = match ? Number(match[1] || 0) : files.length;
  const insertions = match ? Number(match[2] || 0) : 0;
  const deletions = match ? Number(match[3] || 0) : 0;
  const totalLines = insertions + deletions;

  const warnings = [];
  if (changedFileCount > FILE_LIMIT) {
    warnings.push(
      new ValidationError(`staged changes touch ${changedFileCount} files (limit ${FILE_LIMIT})`),
    );
  }
  if (totalLines > LINE_LIMIT) {
    warnings.push(
      new ValidationError(`staged changes modify ${totalLines} lines (limit ${LINE_LIMIT})`),
    );
  }

  const ok = strict ? warnings.length === 0 : true;
  const output = result(
    'changeset-size-check',
    ok,
    strict ? warnings : [],
    strict ? [] : warnings,
    {
      changedFileCount,
      totalLines,
      insertions,
      deletions,
      strict,
      files,
    },
  );

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (warnings.length === 0) {
    console.log('changeset-size-check: OK');
    return;
  }

  const banner = `changeset-size-check: ${strict ? 'FAIL' : 'WARN'}`;
  const details = warnings.map((warning) => `- ${warning.message ?? warning}`).join('\n');
  const guidance =
    '- Consider splitting the work into smaller slices or making the seam commit first.';
  const stream = strict ? process.stderr : process.stdout;
  stream.write(`${banner}\n${details}\n${guidance}\n`);
  if (!ok) process.exit(1);
}

main();
