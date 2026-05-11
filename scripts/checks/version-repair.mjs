/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Walk git history per file to determine the true last-content-change commit and repair @version fields to truth.
 * @sidecar version-repair.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Git helpers (injectable for testing)
// ---------------------------------------------------------------------------

export function gitLines(args, { cwd = ROOT } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) return [];
  return r.stdout.trim().split('\n').filter(Boolean);
}

export function gitText(args, { cwd = ROOT } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) return '';
  return r.stdout;
}

// ---------------------------------------------------------------------------
// Core algorithm (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Determine if a git diff represents a stamp-only change (only the @version
 * line changed, nothing else). Returns false when changedLines is zero so
 * that empty diffs (pre-rename path, binary, no-op) are NOT treated as
 * stamp-only and the commit is skipped by the caller.
 */
export function isStampOnlyDiff(diffText) {
  if (!diffText) return false;

  const lines = diffText.split('\n');
  let changedLines = 0;
  let stampOnlyChangedLines = 0;

  for (const line of lines) {
    // Skip diff metadata and context lines
    if (
      line.startsWith('+++ ') ||
      line.startsWith('--- ') ||
      line.startsWith('diff ') ||
      line.startsWith('index ') ||
      line.startsWith('new file') ||
      line.startsWith('old file') ||
      line.startsWith('deleted file') ||
      line.startsWith('similarity') ||
      line.startsWith('rename ') ||
      line.startsWith('@@ ') ||
      line.startsWith('Binary ') ||
      line.startsWith('\\') ||
      line.startsWith('commit ') ||
      line.startsWith('Author:') ||
      line.startsWith('Date:') ||
      line.startsWith('    ') // commit message lines
    ) {
      continue;
    }

    if (line.startsWith('+') || line.startsWith('-')) {
      changedLines++;
      const content = line.substring(1);
      // Match the @version line in any slim header comment style
      if (/@version\s+[\d.]+\s*\|\s*\d{4}-\d{2}-\d{2}/.test(content)) {
        stampOnlyChangedLines++;
      }
    }
  }

  // changedLines must be > 0: empty diff means file not at this path (pre-rename)
  return changedLines > 0 && changedLines === stampOnlyChangedLines;
}

/**
 * Check if text contains a slim inline @HEADER block.
 * Supports block comments (/* ... *\/), HTML comments (<!-- ... -->),
 * and hash comments (# ...).
 */
export function hasSlimInlineHeader(text) {
  return (
    /\/\*\s*@HEADER/.test(text) ||
    /<!--\s*@HEADER/.test(text) ||
    /^#\s*@HEADER/m.test(text)
  );
}

/**
 * Read the current @version value from the file's slim @HEADER block.
 * Returns { found: true, version, date } or { found: false }.
 */
export function readVersionField(text) {
  const m = text.match(/@version\s+([\d.]+)\s*\|\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return { found: false };
  return { found: true, version: m[1], date: m[2] };
}

/**
 * Replace the @version line in the file text with a new version+date.
 * Only replaces the FIRST occurrence (which is always in the @HEADER block).
 */
export function rewriteVersionField(text, newVersion, newDate) {
  return text.replace(
    /(@version\s+)[\d.]+\s*\|\s*\d{4}-\d{2}-\d{2}/,
    `$1${newVersion} | ${newDate}`,
  );
}

// ---------------------------------------------------------------------------
// Git history helpers (injectable for testing)
// ---------------------------------------------------------------------------

/**
 * Return commit hashes for a file, newest first, following renames.
 * Each entry is { hash, date } where date is YYYY-MM-DD.
 */
export function gitCommitsForFile(filePath, { runGitLines = gitLines } = {}) {
  const raw = runGitLines([
    'log',
    '--follow',
    '--pretty=format:%H %cs',
    '--',
    filePath,
  ]);
  return raw
    .filter(Boolean)
    .map((line) => {
      const spaceIdx = line.indexOf(' ');
      return { hash: line.slice(0, spaceIdx), date: line.slice(spaceIdx + 1) };
    });
}

/**
 * Return the unified diff of a specific file at a specific commit.
 * Uses git show which shows the diff relative to the parent commit(s).
 */
export function getFileDiffAtCommit(commit, filePath, { runGitText = gitText } = {}) {
  return runGitText(['show', commit, '--', filePath]);
}

/**
 * Return the VERSION string recorded at a specific commit.
 * Falls back to '0.0.0' if VERSION didn't exist then.
 */
export function getVersionAtCommit(commit, { runGitText = gitText, cache = null } = {}) {
  if (cache && cache.has(commit)) return cache.get(commit);
  const text = runGitText(['show', `${commit}:VERSION`]);
  const version = text.trim() || '0.0.0';
  if (cache) cache.set(commit, version);
  return version;
}

/**
 * Walk git history for a file (newest first) and return the commit hash
 * of the last content-changing commit — i.e., the first commit (newest)
 * where changes beyond just the @version stamp line occurred.
 *
 * Returns null if the file has no commits at all.
 */
export function findLastContentChangeCommit(
  filePath,
  {
    runGitLines = gitLines,
    runGitText = gitText,
    versionCache = null,
  } = {},
) {
  const commits = gitCommitsForFile(filePath, { runGitLines });
  if (commits.length === 0) return null;

  for (const { hash } of commits) {
    const diff = getFileDiffAtCommit(hash, filePath, { runGitText });
    // Skip commits where the file didn't exist at this path yet (pre-rename):
    // those produce empty diffs with no @@ hunks.
    if (!diff.includes('@@')) continue;
    if (!isStampOnlyDiff(diff)) return hash;
  }

  // All reachable diffs were stamp-only. Fall back to the oldest commit that
  // actually has the file at this path (theoretically unreachable for creation
  // commits since they always have non-stamp content, but handle gracefully).
  for (let i = commits.length - 1; i >= 0; i--) {
    const diff = getFileDiffAtCommit(commits[i].hash, filePath, { runGitText });
    if (diff.includes('@@')) return commits[i].hash;
  }

  // Last resort: return oldest commit hash
  return commits[commits.length - 1].hash;
}

// ---------------------------------------------------------------------------
// Per-file repair
// ---------------------------------------------------------------------------

/**
 * Repair the @version field in one file.
 *
 * @param {string} filePath - Repo-relative posix path
 * @param {{ write: boolean, runGitLines, runGitText, versionCache }} opts
 * @returns {{ status: 'skipped'|'already_correct'|'dry_run'|'repaired', reason?, from?, to? }}
 */
export function repairFile(
  filePath,
  {
    write = false,
    runGitLines = gitLines,
    runGitText = gitText,
    versionCache = null,
  } = {},
) {
  const absPath = path.join(ROOT, filePath);
  let text;
  try {
    text = readFileSync(absPath, 'utf8');
  } catch {
    return { status: 'skipped', reason: 'unreadable' };
  }

  if (!hasSlimInlineHeader(text)) {
    return { status: 'skipped', reason: 'no-slim-header' };
  }

  const current = readVersionField(text);
  if (!current.found) {
    return { status: 'skipped', reason: 'no-version-field' };
  }

  const lastContentCommit = findLastContentChangeCommit(filePath, {
    runGitLines,
    runGitText,
    versionCache,
  });
  if (!lastContentCommit) {
    return { status: 'skipped', reason: 'no-commits' };
  }

  const targetVersion = getVersionAtCommit(lastContentCommit, {
    runGitText,
    cache: versionCache,
  });

  // Read the commit date from the commits list
  const commits = gitCommitsForFile(filePath, { runGitLines });
  const commitEntry = commits.find((c) => c.hash === lastContentCommit);
  const targetDate = commitEntry ? commitEntry.date : current.date;

  const from = `${current.version} | ${current.date}`;
  const to = `${targetVersion} | ${targetDate}`;

  if (from === to) {
    return { status: 'already_correct', from, to };
  }

  if (!write) {
    return { status: 'dry_run', from, to };
  }

  const updated = rewriteVersionField(text, targetVersion, targetDate);
  writeFileSync(absPath, updated, 'utf8');
  return { status: 'repaired', from, to };
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

/**
 * Return all tracked files (posix paths) that have slim @HEADER blocks.
 * Filtered by scope prefix if provided. .agents/** skipped when skipGenerated.
 */
export function collectSlimHeaderFiles({
  scopePrefix = null,
  skipGenerated = false,
  runGitLines = gitLines,
} = {}) {
  const allTracked = runGitLines(['ls-files']);
  const results = [];

  for (const file of allTracked) {
    if (!file.match(/\.(mjs|js|mts|ts|tsx|md)$/)) continue;
    if (file.match(/\.header\.md$/)) continue; // sidecar files, never have inline @HEADER
    if (skipGenerated && (file.startsWith('.agents/') || file.startsWith('.agents\\'))) continue;

    if (scopePrefix) {
      const prefixes = scopePrefix.split(',').map((p) => p.trim().replace(/\\/g, '/'));
      const posix = file.replace(/\\/g, '/');
      const inScope = prefixes.some((p) => posix === p || posix.startsWith(p + '/'));
      if (!inScope) continue;
    }

    // Read first 400 bytes to check for slim @HEADER without loading the full file
    const absPath = path.join(ROOT, file);
    let snippet;
    try {
      snippet = readFileSync(absPath, 'utf8').slice(0, 400);
    } catch {
      continue;
    }
    if (!hasSlimInlineHeader(snippet)) continue;

    results.push(file);
  }

  return results;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    dryRun: false,
    write: false,
    scope: null,
    skipGenerated: false,
  };
  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--write') opts.write = true;
    else if (arg === '--skip-generated') opts.skipGenerated = true;
    else if (arg.startsWith('--scope=')) opts.scope = arg.slice('--scope='.length);
  }
  return opts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const opts = parseCliArgs(process.argv);

  if (!opts.dryRun && !opts.write) {
    console.error('Usage: version-repair.mjs [--dry-run | --write] [--scope=<prefix>] [--skip-generated]');
    process.exit(1);
  }

  console.log('version-repair: collecting slim-header files...');
  const files = collectSlimHeaderFiles({
    scopePrefix: opts.scope,
    skipGenerated: opts.skipGenerated,
  });
  console.log(`  found ${files.length} file(s) with slim @HEADER blocks`);

  const versionCache = new Map();
  const stats = { repaired: 0, already_correct: 0, skipped: 0, dry_run: 0 };
  const repairs = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if ((i + 1) % 100 === 0) {
      process.stdout.write(`  processed ${i + 1}/${files.length}...\r`);
    }
    const result = repairFile(file, {
      write: opts.write,
      versionCache,
    });
    stats[result.status] = (stats[result.status] || 0) + 1;
    if (result.status === 'dry_run' || result.status === 'repaired') {
      repairs.push({ file, ...result });
    }
  }

  process.stdout.write('\n');

  if (repairs.length > 0) {
    console.log('\nChanges:');
    for (const r of repairs) {
      const tag = opts.write ? 'OK' : '~';
      console.log(`  ${tag} ${r.file}`);
      console.log(`      from: ${r.from}`);
      console.log(`        to: ${r.to}`);
    }
  }

  const mode = opts.write ? 'written' : 'would change (dry-run)';
  console.log(`\nSummary:`);
  console.log(`  ${mode}:         ${stats.repaired || stats.dry_run || 0}`);
  console.log(`  already correct: ${stats.already_correct || 0}`);
  console.log(`  skipped:         ${stats.skipped || 0}`);
  console.log(`  total files:     ${files.length}`);
}
