/* @HEADER
 * @version 0.8.9 | 2026-05-11
 * @purpose Add, upgrade, or repair structured header v2 blocks and sidecars for repository files while preserving canonical insertion order.
 * @sidecar header-fix.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  changedFilesSinceRef,
  changedRepoFiles,
  collectRepoFiles,
  commentStyle,
  defaultHeaderData,
  ensureWriteIfChanged,
  fileExists,
  hasLegacyTemplateHeader,
  hasStructuredInlineHeader,
  isHeaderExempt,
  isMeaningfulFile,
  isSidecarHeader,
  parseArgs,
  parseStructuredHeaderText,
  readText,
  renderSidecarHeader,
  injectInlineHeader,
  result,
  sidecarPath,
  mergeExistingSemanticData,
  headerStampVersion,
  hasSlimHeader,
  parseSlimHeader,
  injectSlimHeader,
  inferLayer,
  inferHexLayer,
  inferBoundedContext,
  inferPublic,
  EDIT_POLICY_VALUES,
  resolveScope,
  toPosix,
} from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const changedOnly = args.has('--changed');
const allFlag = args.has('--all');
const sinceRef = typeof args.get('--since') === 'string' ? args.get('--since') : null;
const filesFromArg = typeof args.get('--files-from') === 'string' ? args.get('--files-from') : null;
const lazyStamp = args.has('--lazy-stamp');
const useCurrentVersion = args.has('--use-current-version');
const fromPreCommit = process.env.COA_PRE_COMMIT === '1';
const { filter: scopeFilter, isScoped } = resolveScope(args.get('--scope'));

// Safety: require an explicit selector when called manually (not from pre-commit).
// Prevents accidental repo-wide header regeneration in parallel sessions.
// `--all` is the explicit operator-only opt-in for repo-wide refactors
// (e.g. an ADR change touching every file). Pre-commit uses `--since=HEAD`
// so it operates only on files that actually differ from HEAD, never the
// entire repository. `--files-from=<path|->` is also an explicit selector
// (post-commit hook narrows to git diff-tree set this way per ADR-0014).
if (!fromPreCommit && !changedOnly && !isScoped && !sinceRef && !allFlag && !filesFromArg) {
  console.error(
    'header-fix: manual run requires one of --scope=<dir> | --changed | --since=<ref> | --files-from=<path|-> | --all.\n' +
      "Running without a selector in a parallel session can overwrite other sessions' files.\n" +
      'Use: node scripts/checks/header-fix.mjs --scope=apps/my-app\n' +
      'Or:  node scripts/checks/header-fix.mjs --changed\n' +
      'Or:  node scripts/checks/header-fix.mjs --since=HEAD\n' +
      'Or:  node scripts/checks/header-fix.mjs --files-from=- (read paths from stdin)\n' +
      'Or:  node scripts/checks/header-fix.mjs --all   (explicit global refactor only)',
  );
  process.exit(1);
}

/**
 * Read newline-separated file paths from <path> or stdin (when path === '-').
 * Lines are trimmed; blanks are dropped; entries are normalized to POSIX
 * separators, deduplicated, filtered through `isMeaningfulFile`, and sorted.
 *
 * Empty input returns an empty array — there is no fallback to the whole
 * repository. This is what lets the post-commit hook (TPL-233) feed
 * `git diff-tree --no-commit-id --name-only -r HEAD` straight in and trust
 * that nothing outside HEAD's changed-set will be walked.
 */
function readFilesFrom(source) {
  let raw;
  if (source === '-') {
    raw = readFileSync(0, 'utf8');
  } else {
    raw = readFileSync(source, 'utf8');
  }
  const lines = String(raw)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(toPosix);
  return [...new Set(lines)].filter(isMeaningfulFile).sort();
}

async function selectFiles() {
  let files;
  if (filesFromArg) files = readFilesFrom(filesFromArg);
  else if (sinceRef) files = await changedFilesSinceRef(sinceRef);
  else if (changedOnly) files = await changedRepoFiles();
  else files = await collectRepoFiles();

  // Pre-commit Phase 5 stamps hook versions with --use-current-version.
  // Exclude the currently-running hook from that pass: rewriting
  // .githooks/pre-commit while the shell is executing it can invalidate
  // parsing mid-flight on some platforms/worktrees. (TPL-319)
  if (fromPreCommit && useCurrentVersion) {
    files = files.filter((file) => toPosix(file) !== '.githooks/pre-commit');
  }

  return files;
}

async function main() {
  const changed = [];
  const files = await selectFiles();
  const repoVersionStamp = headerStampVersion();

  for (const file of files) {
    if (isSidecarHeader(file)) continue;
    if (isHeaderExempt(file)) continue;

    const current = fileExists(file) ? await readText(file) : '';
    const style = commentStyle(file, current);

    if (style === 'sidecar') {
      const sidecar = sidecarPath(file);
      const currentSidecar = fileExists(sidecar) ? await readText(sidecar) : null;
      // If sparse sidecar already exists, leave it alone
      if (currentSidecar && currentSidecar.startsWith('---\n')) continue;
      // Old heavy sidecar — fix with old method. Legacy sidecars are migrated
      // away and re-stamped with the current repo VERSION (lazy-stamp does not
      // touch this rare path; ADR-0014's last-changed semantics live primarily
      // on the slim-header path below).
      const parsed = currentSidecar ? parseStructuredHeaderText(sidecar, currentSidecar) : null;
      const nextData = {
        ...mergeExistingSemanticData(parsed, defaultHeaderData(sidecar, { asSidecar: true })),
        version: repoVersionStamp,
      };
      const nextText = renderSidecarHeader(file, nextData);
      if (await ensureWriteIfChanged(sidecar, nextText)) changed.push(sidecar);
      continue;
    }

    // File already has slim header.
    // - default mode: re-stamp @version to the current repo VERSION (eager).
    // - --lazy-stamp:  preserve the parsed @version (ADR-0014: @version
    //   tracks last-content-change, not last-released VERSION). Structural
    //   re-render still happens via injectSlimHeader, but ensureWriteIfChanged
    //   skips when the bytes are identical, so a no-op pass produces no write.
    // - --use-current-version: always stamp current VERSION, overriding
    //   --lazy-stamp (TPL-246: pre-commit Phase 5 preemptive stamping).
    if (hasSlimHeader(file, current)) {
      const parsed = parseSlimHeader(file, current);
      if (parsed) {
        // parseSlimHeader returns the entire `<version> | <date>` substring as
        // `parsed.version`. The slim renderer appends its own ` | <today>`
        // tail, so we must pass only the leading version token, never the
        // date-bearing remainder, or the rendered header doubles the date.
        const parsedVersionOnly = parsed.version
          ? String(parsed.version).split('|')[0].trim()
          : null;
        const stampedVersion =
          !useCurrentVersion && lazyStamp && parsedVersionOnly
            ? parsedVersionOnly
            : repoVersionStamp;
        const slimData = {
          version: stampedVersion,
          purpose: parsed.purpose,
          sidecar: parsed.sidecar || path.basename(sidecarPath(file)),
          layer: parsed.layer || inferLayer(file),
          hex: parsed.hex || inferHexLayer(file),
          ctx: parsed.ctx || inferBoundedContext(file),
          public: parsed.public || inferPublic(file),
          edit: EDIT_POLICY_VALUES.has(parsed.edit) ? parsed.edit : 'careful',
        };
        const nextText = injectSlimHeader(file, current, slimData);
        if (await ensureWriteIfChanged(file, nextText)) changed.push(file);
      }
      continue;
    }

    // Old heavy inline header — fix with old method
    const structured = hasStructuredInlineHeader(file, current);
    const legacy = hasLegacyTemplateHeader(current);

    // If file has no header at all but a sidecar exists, inject slim (not heavy)
    if (!structured && !legacy) {
      const sc = sidecarPath(file);
      const sidecarExists = await fileExists(sc);
      if (sidecarExists) {
        // Sidecar present — inject slim header pointing to it
        const slimData = {
          version: repoVersionStamp,
          purpose: `${path.basename(file)} — see sidecar for details.`,
          sidecar: path.basename(sc),
          layer: inferLayer(file),
          hex: inferHexLayer(file),
          ctx: inferBoundedContext(file),
          public: inferPublic(file),
          edit: 'careful',
        };
        const nextText = injectSlimHeader(file, current, slimData);
        if (await ensureWriteIfChanged(file, nextText)) changed.push(file);
        continue;
      }
    }

    const parsed = structured ? parseStructuredHeaderText(file, current) : null;
    const nextData = {
      ...mergeExistingSemanticData(parsed, defaultHeaderData(file)),
      version: repoVersionStamp,
    };
    const nextText = injectInlineHeader(file, current, nextData);

    if (!structured && !legacy && nextText === current) continue;
    if (await ensureWriteIfChanged(file, nextText)) changed.push(file);
  }

  // Auto-stage every file stamped by --use-current-version so @version lands
  // in the commit blob rather than remaining as working-tree residue (TPL-246,
  // TPL-261). Gate removed: prior COA_PRE_COMMIT=1 gate left files unstaged
  // when invoked outside pre-commit, accumulating cascade residue.
  if (useCurrentVersion && changed.length > 0) {
    for (const f of changed) {
      spawnSync('git', ['add', f], { stdio: 'pipe' });
    }
  }

  const mode = filesFromArg
    ? `files-from:${filesFromArg}`
    : sinceRef
      ? `since:${sinceRef}`
      : changedOnly
        ? 'changed'
        : allFlag
          ? 'all'
          : 'repo';
  const output = result('header-fix', true, [], [], {
    mode,
    lazyStamp,
    useCurrentVersion,
    changed,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(
      changed.length ? `header-fix updated ${changed.length} file(s)` : 'header-fix no changes',
    );
  }
}

main().catch((error) => {
  const output = result('header-fix', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
