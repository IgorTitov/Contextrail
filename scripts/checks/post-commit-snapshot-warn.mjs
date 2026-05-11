/* @HEADER
 * @version 0.7.62 | 2026-05-03
 * @purpose Post-commit snapshot warning — prints a loud reminder when HEAD bumped VERSION but no matching .backups/ snapshot exists, so operators know to run `pnpm mergezip:no-bump`.
 * @sidecar post-commit-snapshot-warn.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Post-commit snapshot warning (TPL-260).
 *
 * Called by `.githooks/post-commit` after every commit. Reads HEAD VERSION
 * and HEAD~1 VERSION from git, then checks whether the matching .backups/
 * snapshot files exist. If VERSION was bumped AND the snapshot is missing,
 * prints a loud operator-visible reminder.
 *
 * Fast read-only check: no filesystem mutations, no git mutations, exits 0
 * always (never blocks anything). Typical runtime < 200 ms.
 *
 * Exports `snapshotWarnCheck` (re-exported from snapshot-coverage-check.mjs
 * for backwards compat) and the testable `collectWarnState` I/O bundle so
 * integration tests can run the check logic against any fixture without
 * spawning a full git hook.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { snapshotWarnCheck } from './snapshot-coverage-check.mjs';

export { snapshotWarnCheck };

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = __dirname;

/**
 * Collect the observable state needed to decide whether to warn.
 * Pure I/O bundle — reads git + filesystem; no console output.
 *
 * @param {string} repoRoot - Absolute path to the git repo root.
 * @returns {{ newVersion, prevVersion, backupFiles, pkgName }}
 */
export function collectWarnState(repoRoot) {
  function gitShow(ref, path) {
    try {
      return execSync(`git show ${ref}:${path}`, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();
    } catch {
      return null;
    }
  }

  const newVersion = gitShow('HEAD', 'VERSION');
  const prevVersion = gitShow('HEAD~1', 'VERSION');

  let pkgName = 'repo';
  try {
    pkgName = JSON.parse(
      readFileSync(join(repoRoot, 'package.json'), 'utf8'),
    ).name || 'repo';
  } catch { /* fallback */ }

  const backupsDir = join(repoRoot, '.backups');
  const backupFiles = existsSync(backupsDir)
    ? readdirSync(backupsDir)
    : [];

  return { newVersion, prevVersion, backupFiles, pkgName };
}

/**
 * Print warning to stdout when a snapshot is missing after a VERSION bump.
 * Returns true if a warning was emitted.
 *
 * @param {string} repoRoot
 */
export function runPostCommitWarn(repoRoot) {
  const state = collectWarnState(repoRoot);
  const result = snapshotWarnCheck(state);
  if (!result.shouldWarn) return false;

  const missing = [
    result.missingTxt && '.txt',
    result.missingZip && '.zip',
  ].filter(Boolean).join(' + ');

  console.log('');
  console.log('WARNING (TPL-260): VERSION ' + state.newVersion + ' committed without snapshot in .backups/');
  console.log('  Missing: ' + missing);
  console.log('  Run: pnpm mergezip:no-bump');
  console.log('');
  return true;
}

const isDirectRun = process.argv[1]
  && (process.argv[1].endsWith('post-commit-snapshot-warn.mjs')
    || process.argv[1].endsWith('post-commit-snapshot-warn'));

if (isDirectRun) {
  const repoRoot = process.cwd();
  runPostCommitWarn(repoRoot);
  process.exit(0);
}
