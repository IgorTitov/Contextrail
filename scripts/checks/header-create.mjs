/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Create structured header v2 blocks or <file>.header.md sidecars for explicitly listed files.
 * @sidecar header-create.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import {
  commentStyle,
  ensureWriteIfChanged,
  fileExists,
  hasStructuredInlineHeader,
  isHeaderExempt,
  parseArgs,
  readText,
  result,
  sidecarPath,
  headerStampVersion,
  hasSlimHeader,
  injectSlimHeader,
  renderSparseSidecar,
  defaultHeaderData,
  inferLayer,
  inferHexLayer,
  inferBoundedContext,
  inferPublic,
} from './_shared.mjs';
import { FileNotFoundError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');

async function main() {
  const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

  if (targets.length === 0) {
    console.error('Usage: node scripts/checks/header-create.mjs <file1> <file2> ...');
    process.exit(1);
  }

  const changed = [];
  const skipped = [];
  const errors = [];
  const repoVersionStamp = headerStampVersion();

  for (const file of targets) {
    if (!fileExists(file)) {
      errors.push(new FileNotFoundError(`Missing file: ${file}`, { file }));
      continue;
    }
    if (isHeaderExempt(file)) {
      skipped.push(file);
      continue;
    }

    const current = fileExists(file) ? await readText(file) : '';
    const sidecar = sidecarPath(file);
    const style = commentStyle(file, current);

    // Already has a header — skip
    if (
      hasSlimHeader(file, current) ||
      (style !== 'sidecar' && hasStructuredInlineHeader(file, current))
    ) {
      skipped.push(file);
      continue;
    }

    const defaults = defaultHeaderData(file);
    const fi = defaults.fileinfo;

    if (style === 'sidecar') {
      // Sidecar-only file (JSON, SVG, etc.) — create sparse sidecar
      if (fileExists(sidecar)) {
        skipped.push(sidecar);
        continue;
      }
      const sparseText = renderSparseSidecar(file, { fileinfo: fi, changelog: defaults.changelog });
      await ensureWriteIfChanged(sidecar, sparseText);
      changed.push(sidecar);
      continue;
    }

    // Create slim inline header + sparse sidecar
    const slimData = {
      version: repoVersionStamp,
      purpose: defaults.purpose,
      sidecar: path.basename(sidecar),
      layer: fi.Layer || inferLayer(file),
      hex: fi.HexLayer || inferHexLayer(file),
      ctx: fi.BoundedContext || inferBoundedContext(file),
      public: fi.Public || inferPublic(file),
      edit: 'careful',
    };

    const newText = injectSlimHeader(file, current, slimData);
    await ensureWriteIfChanged(file, newText);
    changed.push(file);

    if (!fileExists(sidecar)) {
      const sparseText = renderSparseSidecar(file, { fileinfo: fi, changelog: defaults.changelog });
      await ensureWriteIfChanged(sidecar, sparseText);
      changed.push(sidecar);
    }
  }

  const output = result('header-create', errors.length === 0, errors, [], {
    changed,
    skipped,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }

  console.log(`header-create: wrote ${changed.length}, skipped ${skipped.length}`);
}

main().catch((error) => {
  const output = result('header-create', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
