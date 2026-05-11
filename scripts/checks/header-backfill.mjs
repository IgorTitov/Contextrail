/* @HEADER
 * @version 0.7.35 | 2026-04-28
 * @purpose One-shot migration walking every header-bearing file to backfill @version with last-content-change VERSION (ADR-0014, TPL-233).
 * @sidecar header-backfill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * For each meaningful tracked file with an inline slim header (and its sparse
 * sidecar, if any), this script resolves the file's last-content-change
 * VERSION and writes it into the @version field.
 *
 * Resolution algorithm (ADR-0014 §Migration):
 *   1. `git log -1 --follow --format=%H -- <file>` → last commit touching it.
 *   2. `git show <hash>:VERSION` → the VERSION that was current at that commit.
 *   3. Write that VERSION to the file's @version. Date stays today's.
 *
 * Edge-case fallbacks (fail-soft, log a warning, never block the migration):
 *   - File added in HEAD only / no prior history → stamp current VERSION.
 *   - `git show <hash>:VERSION` fails (VERSION did not exist at that commit) →
 *     stamp current VERSION + WARN.
 *   - File exists in working tree but is not yet committed → stamp current
 *     VERSION + WARN.
 *
 * The sparse sidecar's @version (if present) tracks the *parent file's*
 * last-content-change (ADR-0014). Sidecars are never resolved independently —
 * their @version mirrors the parent's resolved value.
 *
 * Output:
 *   - Per-file structured report at docs/_generated/header-backfill-report.json
 *     listing { file, hash, resolvedVersion, fallback, before, after, action }
 *     for audit + regression debugging.
 *   - Stdout: short progress + summary; --json to dump the full report instead.
 *
 * Idempotent. Re-running on a converged tree produces zero writes.
 */

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectRepoFiles,
  commentStyle,
  ensureWriteIfChanged,
  fileExists,
  hasSlimHeader,
  isHeaderExempt,
  isSidecarHeader,
  parseArgs,
  parseSlimHeader,
  injectSlimHeader,
  readText,
  result,
  ROOT,
  sidecarPath,
  EDIT_POLICY_VALUES,
  inferLayer,
  inferHexLayer,
  inferBoundedContext,
  inferPublic,
  headerStampVersion,
} from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');

const REPORT_PATH = 'docs/_generated/header-backfill-report.json';

/**
 * Run a git command and return { ok, stdout, stderr }.
 * Never throws on non-zero exit — backfill must fail soft.
 */
function git(cmdArgs) {
  const out = spawnSync('git', cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    ok: out.status === 0,
    stdout: String(out.stdout || ''),
    stderr: String(out.stderr || ''),
    status: out.status,
  };
}

/**
 * Resolve the last commit that changed <file>'s content via git log --follow.
 * Returns null if the file has no history (e.g. uncommitted, or new in HEAD
 * with no prior path).
 */
function resolveLastChangeHash(file) {
  const out = git(['log', '-1', '--follow', '--format=%H', '--', file]);
  if (!out.ok) return null;
  const hash = out.stdout.trim();
  return hash || null;
}

/**
 * Read VERSION as it stood at <hash>. Returns null if the show fails (VERSION
 * did not exist at that commit, e.g. the file predates the VERSION file).
 */
function resolveVersionAtHash(hash) {
  const out = git(['show', `${hash}:VERSION`]);
  if (!out.ok) return null;
  const v = out.stdout.trim();
  return v || null;
}

/**
 * Resolve the @version value to write into <file>.
 * Returns { resolved, hash, fallback } where fallback is one of:
 *   - null              — clean resolution via git log + git show
 *   - 'no-history'      — git log returned no hash (uncommitted)
 *   - 'no-version-file' — git log resolved a hash, but git show <hash>:VERSION failed
 */
export function resolveBackfillVersion(file, {
  currentVersion,
  runResolveHash = resolveLastChangeHash,
  runResolveVersionAtHash = resolveVersionAtHash,
} = {}) {
  const hash = runResolveHash(file);
  if (!hash) {
    return { resolved: currentVersion, hash: null, fallback: 'no-history' };
  }
  const versionAtHash = runResolveVersionAtHash(hash);
  if (!versionAtHash) {
    return { resolved: currentVersion, hash, fallback: 'no-version-file' };
  }
  return { resolved: versionAtHash, hash, fallback: null };
}

async function backfillSlimHeader(file, resolved) {
  const current = await readText(file);
  if (!hasSlimHeader(file, current)) return { wrote: false, before: null, after: null };
  const parsed = parseSlimHeader(file, current);
  if (!parsed) return { wrote: false, before: null, after: null };

  // parseSlimHeader returns "<version> | <date>" as one string in parsed.version.
  // Split on `|` so the renderer (which appends its own date tail) does not
  // produce a double-dated `@version A.B.C | YYYY-MM-DD | YYYY-MM-DD` line.
  const parsedVersionOnly = parsed.version
    ? String(parsed.version).split('|')[0].trim()
    : null;

  const slimData = {
    version: resolved,
    purpose: parsed.purpose,
    sidecar: parsed.sidecar || path.basename(sidecarPath(file)),
    layer: parsed.layer || inferLayer(file),
    hex: parsed.hex || inferHexLayer(file),
    ctx: parsed.ctx || inferBoundedContext(file),
    public: parsed.public || inferPublic(file),
    edit: EDIT_POLICY_VALUES.has(parsed.edit) ? parsed.edit : 'careful',
  };
  const next = injectSlimHeader(file, current, slimData);
  if (dryRun) return { wrote: false, before: parsedVersionOnly, after: resolved, next };
  const wrote = await ensureWriteIfChanged(file, next);
  return { wrote, before: parsedVersionOnly, after: resolved };
}

/**
 * Update a sparse sidecar's @version (if present) by string-replacing the
 * @version line in its YAML frontmatter. Sidecars without an @version key
 * are left alone — only files that already carry the field get migrated.
 */
async function backfillSidecar(sidecarFile, resolved) {
  if (!fileExists(sidecarFile)) return { wrote: false, before: null, after: null };
  const text = await readText(sidecarFile);
  // Sparse sidecar (YAML-only, no @version field today) — skip.
  if (text.startsWith('---\n')) return { wrote: false, before: null, after: null };
  // Heavy-format sidecars carry an @version line in HTML-style or list format.
  const versionLineRe = /^(\s*[*#-]?\s*@version\s+)([^\s|]+)(\s*\|\s*[\d-]+\s*)$/m;
  const match = text.match(versionLineRe);
  if (!match) return { wrote: false, before: null, after: null };
  const before = match[2];
  if (before === resolved) return { wrote: false, before, after: resolved };
  const next = text.replace(versionLineRe, `$1${resolved}$3`);
  if (dryRun) return { wrote: false, before, after: resolved };
  const wrote = await ensureWriteIfChanged(sidecarFile, next);
  return { wrote, before, after: resolved };
}

async function main() {
  const currentVersion = headerStampVersion();
  const files = await collectRepoFiles();
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    currentVersion,
    counts: { walked: 0, drifted: 0, alreadyCorrect: 0, fallback: 0, errors: 0 },
    files: [],
  };

  for (const file of files) {
    if (isSidecarHeader(file)) continue;
    if (isHeaderExempt(file)) continue;
    if (commentStyle(file) === 'sidecar') continue;
    if (!fileExists(file)) continue;

    const text = await readText(file);
    if (!hasSlimHeader(file, text)) continue;

    report.counts.walked += 1;

    let entry;
    try {
      const { resolved, hash, fallback } = resolveBackfillVersion(file, { currentVersion });
      if (fallback) {
        report.counts.fallback += 1;
        if (verbose) {
          console.warn(`  WARN: ${file} — fallback (${fallback}) → using ${resolved}`);
        }
      }

      const slimResult = await backfillSlimHeader(file, resolved);
      const sidecarResult = await backfillSidecar(sidecarPath(file), resolved);

      entry = {
        file,
        hash,
        resolvedVersion: resolved,
        fallback,
        slim: { before: slimResult.before, after: slimResult.after, wrote: slimResult.wrote },
        sidecar: { before: sidecarResult.before, after: sidecarResult.after, wrote: sidecarResult.wrote },
      };

      if (slimResult.wrote || sidecarResult.wrote) report.counts.drifted += 1;
      else report.counts.alreadyCorrect += 1;
    } catch (err) {
      report.counts.errors += 1;
      entry = {
        file,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    report.files.push(entry);
  }

  // Persist the report (skip in dry-run so a dry pass cannot pollute _generated).
  if (!dryRun) {
    const abs = path.join(ROOT, REPORT_PATH);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, JSON.stringify(report, null, 2) + '\n', 'utf8');
  }

  const output = result('header-backfill', true, [], [], {
    counts: report.counts,
    reportPath: dryRun ? null : REPORT_PATH,
    dryRun,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    const c = report.counts;
    console.log(
      `header-backfill: walked=${c.walked} drifted=${c.drifted} alreadyCorrect=${c.alreadyCorrect} ` +
      `fallback=${c.fallback} errors=${c.errors}` +
      (dryRun ? ' (dry-run)' : ` → ${REPORT_PATH}`),
    );
  }
}

// Allow importing pure helpers without invoking main().
const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    const output = result('header-backfill', false, [
      error instanceof Error ? error.message : String(error),
    ]);
    if (wantJson) console.log(JSON.stringify(output, null, 2));
    else console.error(output.errors[0]);
    process.exit(1);
  });
}
