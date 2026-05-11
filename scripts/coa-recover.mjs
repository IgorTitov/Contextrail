/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Diagnose and recover from parallel-session collisions — stale claims, VERSION drift, merge conflicts, orphaned worktrees.
 * @sidecar coa-recover.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * COA Recovery Script.
 *
 * Diagnoses parallel-session issues and offers safe fixes.
 *
 * Usage:
 *   node scripts/coa-recover.mjs --diagnose
 *   node scripts/coa-recover.mjs --fix [--yes]
 *   node scripts/coa-recover.mjs --json
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Parse VERSION file content into semver string.
 */
export function readVersion(rootDir) {
  try {
    return readFileSync(join(rootDir, 'VERSION'), 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Read HEAD VERSION via git.
 */
export function readHeadVersion(rootDir) {
  try {
    const result = spawnSync('git', ['show', 'HEAD:VERSION'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return result.status === 0 ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Detect VERSION drift: working != HEAD or working != HEAD+1.
 */
export function detectVersionDrift(workingVersion, headVersion) {
  if (!workingVersion || !headVersion) return { drifted: false, reason: 'missing version' };
  if (workingVersion === headVersion)
    return { drifted: false, reason: 'not bumped (ok if pre-commit)' };

  const parts = headVersion.split('.').map(Number);
  const expectedPatch = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  const expectedMinor = `${parts[0]}.${parts[1] + 1}.0`;
  const expectedMajor = `${parts[0] + 1}.0.0`;

  if (
    workingVersion === expectedPatch ||
    workingVersion === expectedMinor ||
    workingVersion === expectedMajor
  ) {
    return { drifted: false, reason: 'valid bump' };
  }
  return {
    drifted: true,
    reason: `VERSION drift: HEAD=${headVersion}, working=${workingVersion}, expected ${expectedPatch}/${expectedMinor}/${expectedMajor}`,
  };
}

/**
 * Find stale (active but expired) claims in .claims/ directory.
 */
export function findStaleClaims(rootDir, now = new Date()) {
  const claimsDir = join(rootDir, '.claims');
  if (!existsSync(claimsDir)) return [];

  const stale = [];
  for (const file of readdirSync(claimsDir)) {
    if (!file.startsWith('clm-') || !file.endsWith('.json')) continue;
    try {
      const claim = JSON.parse(readFileSync(join(claimsDir, file), 'utf8'));
      if (claim.status === 'active' && new Date(claim.expires) < now) {
        stale.push({ ...claim, _file: file });
      }
    } catch {
      /* skip malformed */
    }
  }
  return stale;
}

/**
 * Check if repo is in merge conflict state.
 */
export function isMergeConflict(rootDir) {
  const mergeHead = join(rootDir, '.git', 'MERGE_HEAD');
  return existsSync(mergeHead);
}

/**
 * Check if repo is in rebase state.
 */
export function isRebaseInProgress(rootDir) {
  const rebaseApply = join(rootDir, '.git', 'rebase-apply');
  const rebaseMerge = join(rootDir, '.git', 'rebase-merge');
  return existsSync(rebaseApply) || existsSync(rebaseMerge);
}

/**
 * Find orphaned COA worktrees (worktrees whose directories no longer exist).
 */
export function findOrphanedWorktrees(rootDir) {
  const result = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) return [];

  const orphaned = [];
  let currentPath = null;
  for (const line of (result.stdout || '').split('\n')) {
    if (line.startsWith('worktree ')) {
      currentPath = line.slice(9).trim();
    } else if (line === '' && currentPath) {
      const name = basename(currentPath);
      if (name.startsWith('coa-session-') && !existsSync(currentPath)) {
        orphaned.push({ name, path: currentPath });
      }
      currentPath = null;
    }
  }
  return orphaned;
}

/**
 * Run full diagnosis and return structured report.
 */
export function diagnose(rootDir) {
  const workingVersion = readVersion(rootDir);
  const headVersion = readHeadVersion(rootDir);
  const versionDrift = detectVersionDrift(workingVersion, headVersion);
  const staleClaims = findStaleClaims(rootDir);
  const mergeConflict = isMergeConflict(rootDir);
  const rebaseInProgress = isRebaseInProgress(rootDir);
  const orphanedWorktrees = findOrphanedWorktrees(rootDir);

  const issues = [];
  if (versionDrift.drifted) issues.push({ type: 'version-drift', detail: versionDrift.reason });
  if (staleClaims.length > 0)
    issues.push({
      type: 'stale-claims',
      detail: `${staleClaims.length} stale claim(s)`,
      claims: staleClaims,
    });
  if (mergeConflict) issues.push({ type: 'merge-conflict', detail: 'Merge conflict in progress' });
  if (rebaseInProgress) issues.push({ type: 'rebase-in-progress', detail: 'Rebase in progress' });
  if (orphanedWorktrees.length > 0)
    issues.push({
      type: 'orphaned-worktrees',
      detail: `${orphanedWorktrees.length} orphaned worktree(s)`,
      worktrees: orphanedWorktrees,
    });

  return {
    ok: issues.length === 0,
    workingVersion,
    headVersion,
    issueCount: issues.length,
    issues,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const map = new Map();
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) map.set(arg.slice(0, eq), arg.slice(eq + 1));
      else map.set(arg, true);
    }
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
  const wantFix = args.has('--fix');

  const report = diagnose(ROOT);

  if (wantJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
    return;
  }

  if (report.ok) {
    console.log('coa-recover: all clear — no parallel-session issues detected');
    return;
  }

  console.log(`coa-recover: ${report.issueCount} issue(s) found\n`);

  for (const issue of report.issues) {
    switch (issue.type) {
      case 'version-drift':
        console.log(`  VERSION DRIFT: ${issue.detail}`);
        console.log('    Fix: git checkout -- VERSION package.json && git pull --rebase');
        break;
      case 'stale-claims':
        console.log(`  STALE CLAIMS: ${issue.detail}`);
        for (const c of issue.claims) {
          console.log(`    ${c.id} (${c.agent}, ${c.slice}) expired at ${c.expires}`);
        }
        console.log('    Fix: node scripts/checks/claim-check.mjs --auto-expire');
        break;
      case 'merge-conflict':
        console.log('  MERGE CONFLICT: repo has unresolved merge conflicts');
        console.log('    Fix: resolve conflicts manually, then git add + git commit');
        console.log('    Or:  git merge --abort to cancel the merge');
        break;
      case 'rebase-in-progress':
        console.log('  REBASE IN PROGRESS: an interrupted rebase exists');
        console.log('    Fix: git rebase --continue (after resolving conflicts)');
        console.log('    Or:  git rebase --abort to cancel');
        break;
      case 'orphaned-worktrees':
        console.log(`  ORPHANED WORKTREES: ${issue.detail}`);
        for (const w of issue.worktrees) {
          console.log(`    ${w.name} -> ${w.path} (directory missing)`);
        }
        console.log('    Fix: git worktree prune');
        break;
    }
    console.log('');
  }

  if (wantFix) {
    console.log('coa-recover --fix: applying safe fixes...\n');

    for (const issue of report.issues) {
      if (issue.type === 'stale-claims') {
        const r = spawnSync(
          process.execPath,
          [join(ROOT, 'scripts/checks/claim-check.mjs'), '--auto-expire'],
          {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: 'pipe',
          },
        );
        console.log(`  ${r.stdout.trim()}`);
      } else if (issue.type === 'orphaned-worktrees') {
        const r = spawnSync('git', ['worktree', 'prune'], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: 'pipe',
        });
        console.log('  Pruned orphaned worktrees');
      } else if (issue.type === 'version-drift') {
        console.log('  VERSION drift requires manual fix: git checkout -- VERSION package.json');
      } else if (issue.type === 'merge-conflict' || issue.type === 'rebase-in-progress') {
        console.log(`  ${issue.type} requires manual resolution`);
      }
    }
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('coa-recover.mjs') || process.argv[1].endsWith('coa-recover'));

if (isDirectRun) {
  main();
}
