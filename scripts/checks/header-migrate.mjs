/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Implement the header-migrate repository script.
 * @sidecar header-migrate.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import {
  changedRepoFiles,
  collectRepoFiles,
  commentStyle,
  defaultHeaderData,
  ensureWriteIfChanged,
  fileExists,
  hasStructuredInlineHeader,
  isHeaderExempt,
  isSidecarHeader,
  parseArgs,
  parseStructuredHeaderText,
  readText,
  result,
  sidecarPath,
  mergeExistingSemanticData,
  headerStampVersion,
  hasSlimHeader,
  injectSlimHeader,
  renderSparseSidecar,
  parseSparseSidecar,
  EDIT_POLICY_VALUES,
  inferLayer,
  inferHexLayer,
  inferBoundedContext,
  inferPublic,
  toPosix,
} from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const dryRun = args.has('--dry-run');
const changedOnly = args.has('--changed');
const force = args.has('--force');

async function main() {
  const migrated = [];
  const skipped = [];
  const errors = [];
  const files = changedOnly ? await changedRepoFiles() : await collectRepoFiles();
  const repoVersionStamp = headerStampVersion();

  for (const file of files) {
    if (isSidecarHeader(file)) continue;
    if (isHeaderExempt(file)) continue;

    try {
      const current = fileExists(file) ? await readText(file) : '';
      const style = commentStyle(file, current);

      // Already has slim header — skip (unless --force re-renders sidecars)
      if (hasSlimHeader(file, current)) {
        if (!force) {
          skipped.push({ file, reason: 'already-slim' });
          continue;
        }
        // --force: re-render existing sidecar with current renderSparseSidecar()
        const sidecar = sidecarPath(file);
        const currentSidecar = fileExists(sidecar) ? await readText(sidecar) : null;
        if (currentSidecar) {
          const parsed = parseSparseSidecar(file, currentSidecar);
          if (parsed) {
            const sparseText = renderSparseSidecar(file, parsed);
            if (!dryRun && (await ensureWriteIfChanged(sidecar, sparseText))) {
              migrated.push(sidecar);
            } else if (dryRun) {
              migrated.push(sidecar);
            }
          } else {
            skipped.push({ file: sidecar, reason: 'unparseable-sidecar' });
          }
        }
        continue;
      }

      const posix = toPosix(file);
      const sidecar = sidecarPath(file);

      if (style === 'sidecar') {
        // File type that can't have inline comments (JSON, SVG, etc.)
        // Migrate existing sidecar to sparse format if it has old heavy header
        const currentSidecar = fileExists(sidecar) ? await readText(sidecar) : null;
        if (!currentSidecar) {
          // Create new sparse sidecar from defaults
          const defaults = defaultHeaderData(sidecar, { asSidecar: true });
          const sparseText = renderSparseSidecar(file, {
            fileinfo: defaults.fileinfo,
            changelog: defaults.changelog,
          });
          if (!dryRun && (await ensureWriteIfChanged(sidecar, sparseText))) {
            migrated.push(sidecar);
          } else if (dryRun) {
            migrated.push(sidecar);
          }
          continue;
        }

        // If sparse sidecar and --force, re-render it
        if (currentSidecar.startsWith('---\n') && force) {
          const sparseParsed = parseSparseSidecar(file, currentSidecar);
          if (sparseParsed) {
            const sparseText = renderSparseSidecar(file, sparseParsed);
            if (!dryRun && (await ensureWriteIfChanged(sidecar, sparseText))) {
              migrated.push(sidecar);
            } else if (dryRun) {
              migrated.push(sidecar);
            }
          } else {
            skipped.push({ file: sidecar, reason: 'unparseable-sidecar' });
          }
          continue;
        }

        const parsed = parseStructuredHeaderText(sidecar, currentSidecar);
        if (!parsed) {
          skipped.push({ file: sidecar, reason: 'no-parseable-header' });
          continue;
        }

        const merged = mergeExistingSemanticData(
          parsed,
          defaultHeaderData(sidecar, { asSidecar: true }),
        );
        const sparseText = renderSparseSidecar(file, {
          fileinfo: merged.fileinfo,
          changelog: merged.changelog,
        });
        if (!dryRun && (await ensureWriteIfChanged(sidecar, sparseText))) {
          migrated.push(sidecar);
        } else if (dryRun) {
          migrated.push(sidecar);
        }
        continue;
      }

      // File has inline comments — migrate heavy -> slim + sidecar
      const hasOldHeader = hasStructuredInlineHeader(file, current);
      const parsed = hasOldHeader ? parseStructuredHeaderText(file, current) : null;
      const defaults = defaultHeaderData(file);
      const merged = parsed ? mergeExistingSemanticData(parsed, defaults) : defaults;

      // Extract fields for slim header
      const fi = merged.fileinfo || {};
      const slimData = {
        version: repoVersionStamp,
        purpose: merged.purpose || fi.Summary || defaults.purpose,
        sidecar: path.basename(sidecar),
        layer: fi.Layer || inferLayer(posix),
        hex: fi.HexLayer || inferHexLayer(posix),
        ctx: fi.BoundedContext || inferBoundedContext(posix),
        public: fi.Public || inferPublic(posix),
        edit: EDIT_POLICY_VALUES.has(fi.EditPolicy) ? fi.EditPolicy : 'careful',
      };

      // Inject slim header (replaces old heavy header)
      const newText = injectSlimHeader(file, current, slimData);

      // Generate sparse sidecar
      const sparseText = renderSparseSidecar(file, {
        fileinfo: merged.fileinfo,
        changelog: merged.changelog,
      });

      if (!dryRun) {
        if (await ensureWriteIfChanged(file, newText)) migrated.push(file);
        if (await ensureWriteIfChanged(sidecar, sparseText)) migrated.push(sidecar);
      } else {
        migrated.push(file);
        migrated.push(sidecar);
      }
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
    }
  }

  const output = result('header-migrate', errors.length === 0, errors, [], {
    mode: dryRun ? 'dry-run' : changedOnly ? 'changed' : 'repo',
    migrated: migrated.length,
    skipped: skipped.length,
    files: migrated,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    const prefix = dryRun ? '[dry-run] ' : '';
    console.log(
      `${prefix}header-migrate: ${migrated.length} file(s) migrated, ${skipped.length} skipped, ${errors.length} error(s)`,
    );
    if (errors.length) {
      for (const e of errors) console.error(`  ERROR: ${e}`);
    }
  }
}

main();
