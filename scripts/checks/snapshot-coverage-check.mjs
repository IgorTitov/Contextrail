/* @HEADER
 * @version 0.7.62 | 2026-05-03
 * @purpose Verify that every versioned `## [X.Y.Z]` heading in CHANGELOG.md has a matching `.backups/merge-<name>(X.Y.Z).{txt,zip}` snapshot, so commits made by `--no-verify` bypass of coa-merge become observable.
 * @sidecar snapshot-coverage-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Snapshot coverage check (R8.1 / TPL-247).
 *
 * Backported from Cockpit AIC-087. Closes the silent-bypass gap: when an
 * operator commits a VERSION+CHANGELOG bump via `git commit --no-verify`
 * (bypassing coa-merge entirely), step 9b's auto-snapshot is never invoked
 * and the `.backups/` archive silently drifts behind the changelog.
 *
 * This check runs against the post-commit filesystem state — no matter how
 * the commit was made, every versioned heading must have its snapshot. Use
 * with `--since=<ref>` from a pre-push hook to validate only newly-added
 * versions.
 *
 * `.backups/` is gitignored (operator-local artifact), so this check is
 * meaningful in the operator's workspace — not on a fresh CI runner.
 *
 * Exit codes:
 *   0 — all versions covered
 *   1 — at least one version is missing .txt and/or .zip
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

// Default minimum version since all template backups include .zip from 0.1.0.
export const DEFAULT_MIN_ZIP_VERSION = '0.1.0';

/**
 * Match `merge-snapshot.mjs#safeName` (used for the `.txt` filename).
 */
export function safeTxtName(name) {
  return String(name || 'repo')
    .replace(/^@/, '')
    .replace(/[^\w.-]+/g, '-');
}

/**
 * Match `scripts/mergezip.mjs#safeName` (used for the `.zip` filename —
 * lowercased, dash-collapsed).
 */
export function safeZipName(name) {
  return (
    String(name || 'repo')
      .replace(/^@/, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9_.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'repo'
  );
}

/**
 * Parse all `## [X.Y.Z]` versioned headings from CHANGELOG text. Skips
 * `## [Unreleased]`. Returns an array of plain version strings in document
 * order (CHANGELOG convention is newest-first).
 */
export function parseChangelogVersions(changelogText) {
  const versions = [];
  const re = /^## \[(\d+\.\d+\.\d+)\]/gm;
  let m;
  while ((m = re.exec(String(changelogText)))) {
    versions.push(m[1]);
  }
  return versions;
}

/**
 * Compare two semver-ish strings. Returns -1 / 0 / 1.
 */
export function compareVersions(a, b) {
  const pa = String(a)
    .split('.')
    .map((n) => Number(n) || 0);
  const pb = String(b)
    .split('.')
    .map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Build the gap report for a list of versions against a backups directory
 * listing. Returns an array of { version, missingTxt, missingZip } entries
 * in input order, with only the gaps included.
 *
 * Versions strictly older than minZipVersion are exempt from .zip checks.
 * In-range versions require both .txt and .zip.
 */
export function findSnapshotGaps({
  versions,
  presentFiles,
  txtName,
  zipName,
  minZipVersion = DEFAULT_MIN_ZIP_VERSION,
}) {
  const present = new Set(presentFiles);
  const gaps = [];
  for (const v of versions) {
    const txt = `merge-${txtName}(${v}).txt`;
    const zip = `merge-${zipName}(${v}).zip`;
    const missingTxt = !present.has(txt);
    const requireZip = compareVersions(v, minZipVersion) >= 0;
    const missingZip = requireZip && !present.has(zip);
    if (missingTxt || missingZip) {
      gaps.push({ version: v, missingTxt, missingZip });
    }
  }
  return gaps;
}

/**
 * Pure helper: should a post-commit snapshot warning be emitted?
 *
 * Returns { shouldWarn: false } when no VERSION bump occurred.
 * Returns { shouldWarn: true, missingTxt, missingZip } when the new
 * version's snapshot files are absent from .backups/.
 *
 * Accepts the backupFiles list as an iterable (array or Set) so callers can
 * pass a directory listing without re-reading the filesystem.
 *
 * @param {object} opts
 * @param {string} opts.newVersion   - VERSION at HEAD (post-commit).
 * @param {string} opts.prevVersion  - VERSION at HEAD~1 (pre-commit).
 * @param {Iterable<string>} opts.backupFiles - File names present in .backups/.
 * @param {string} [opts.pkgName]    - package.json "name" field.
 */
export function snapshotWarnCheck({ newVersion, prevVersion, backupFiles, pkgName } = {}) {
  if (!newVersion || !prevVersion || newVersion === prevVersion) {
    return { shouldWarn: false };
  }
  const txtName = safeTxtName(pkgName || 'repo');
  const zipName = safeZipName(pkgName || 'repo');
  const present = new Set(Array.isArray(backupFiles) ? backupFiles : [...(backupFiles || [])]);
  const missingTxt = !present.has(`merge-${txtName}(${newVersion}).txt`);
  const missingZip = !present.has(`merge-${zipName}(${newVersion}).zip`);
  if (!missingTxt && !missingZip) return { shouldWarn: false };
  return { shouldWarn: true, missingTxt, missingZip };
}

function readPkgName() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).name || 'repo';
  } catch {
    return 'repo';
  }
}

function listBackups(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}

/**
 * Versions seen at HEAD's CHANGELOG that were NOT in <ref>'s CHANGELOG.
 * Used by --since to scope the check to "what this push actually adds".
 */
export function gitVersionsAdded(sinceRef, { gitCmd = defaultGitCmd, headChangelog } = {}) {
  const headVersions = new Set(parseChangelogVersions(headChangelog ?? ''));
  let refText = '';
  const r = gitCmd(['show', `${sinceRef}:CHANGELOG.md`]);
  if (r && r.ok) refText = r.stdout || '';
  const refVersions = new Set(parseChangelogVersions(refText));
  return [...headVersions].filter((v) => !refVersions.has(v));
}

function defaultGitCmd(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function parseArgs(argv = process.argv.slice(2)) {
  const map = new Map();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) map.set(arg.slice(0, eq), arg.slice(eq + 1));
    else map.set(arg, true);
  }
  return {
    has: (k) => map.has(k),
    get: (k) => {
      const v = map.get(k);
      return v === true ? undefined : v;
    },
  };
}

function main() {
  const args = parseArgs();
  const wantJson = args.has('--json');
  const sinceRef = args.get('--since');
  const minZipVersion = args.get('--min-zip-version') || DEFAULT_MIN_ZIP_VERSION;

  const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
  const allVersions = parseChangelogVersions(changelog);
  const versionsToCheck = sinceRef
    ? gitVersionsAdded(sinceRef, { headChangelog: changelog })
    : allVersions;

  const pkgName = readPkgName();
  const txtName = safeTxtName(pkgName);
  const zipName = safeZipName(pkgName);
  const presentFiles = listBackups(join(ROOT, '.backups'));

  const gaps = findSnapshotGaps({
    versions: versionsToCheck,
    presentFiles,
    txtName,
    zipName,
    minZipVersion,
  });

  const ok = gaps.length === 0;
  const errors = gaps.map((g) => {
    const missing = [g.missingTxt && '.txt', g.missingZip && '.zip'].filter(Boolean).join(' + ');
    return `version ${g.version}: missing ${missing} in .backups/`;
  });

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          kind: 'snapshot-coverage-check',
          ok,
          generatedAt: new Date().toISOString(),
          mode: sinceRef ? `since=${sinceRef}` : 'full',
          checked: versionsToCheck.length,
          gaps,
          errors,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `snapshot-coverage-check: ${ok ? 'OK' : 'FAIL'} (${versionsToCheck.length} version(s) checked)`,
    );
    if (!ok) {
      console.log(`  ${gaps.length} version(s) missing snapshot artifacts:`);
      for (const e of errors) console.log(`  - ${e}`);
      console.log('');
      console.log(
        '  This usually means a commit bypassed coa-merge (e.g. `git commit --no-verify`).',
      );
      console.log(
        '  Recovery: check out the commit at the missing version and run `pnpm mergezip`,',
      );
      console.log(
        '  or accept the gap with `git push --no-verify` if you understand the consequences.',
      );
    }
  }
  process.exit(ok ? 0 : 1);
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('snapshot-coverage-check.mjs');
if (isDirectRun) main();
