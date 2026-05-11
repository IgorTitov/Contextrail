/* @HEADER
 * @version 0.7.67 | 2026-05-03
 * @purpose Validate structured header v2 presence, canonical placement, schema consistency, and minimum semantic quality.
 * @sidecar header-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import {
  collectTrackedFiles,
  collectChangedTrackedFiles,
  commentStyle,
  fileExists,
  isHeaderExempt,
  isSidecarHeader,
  parseArgs,
  readText,
  result,
  sidecarPath,
  validateHeader,
  hasSlimHeader,
  parseSlimHeader,
  EDIT_POLICY_VALUES,
  resolveScope,
} from './_shared.mjs';
import { FileNotFoundError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const changedOnly = args.has('--changed');
const { filter: scopeFilter, isScoped } = resolveScope(args.get('--scope'));

/**
 * F2 lint: reject template filler in notesForLLM sidecar fields.
 *
 * The field's only payback is a named invariant, failure mode, or
 * non-obvious gotcha in <25 words. Compliance boilerplate ("Core X
 * logic. Test in isolation") taxes every tier-2 cold read without
 * contributing signal — ADR-0009 intentionally makes the field
 * optional so sidecars with nothing specific to say can drop it.
 *
 * Returns `{ ok: true }` when the note is absent or specific,
 * or `{ ok: false, note, reason }` when it matches a known filler
 * pattern. Exported as a pure function for unit testing.
 *
 * @param {string} sidecarText - Raw sidecar file contents.
 * @returns {{ok: true} | {ok: false, note: string, reason: string}}
 */
export function checkNotesForLLMFiller(sidecarText) {
  const notesMatch = sidecarText.match(/^notesForLLM:\s*(.+)$/m);
  if (!notesMatch) return { ok: true };
  const note = notesMatch[1].trim();
  if (!note) return { ok: true };

  // Mode B F2: the exact "Core X logic. Test in isolation" family.
  if (/^Core \w+ (logic|for the \w+ module)\b/i.test(note)) {
    return { ok: false, note, reason: 'generic-core-logic' };
  }
  if (/\bTest in isolation\b/i.test(note)) {
    return { ok: false, note, reason: 'test-in-isolation-filler' };
  }
  if (/^\w+ for the \w+ module\.?$/i.test(note)) {
    return { ok: false, note, reason: 'x-for-the-y-module' };
  }
  // "Core domain logic." / "Core port logic." variants without "Test in isolation".
  if (/^Core (domain|port|adapter|application)( logic)?\.?$/i.test(note)) {
    return { ok: false, note, reason: 'generic-core-layer' };
  }
  return { ok: true };
}

function validateSlimHeader(file, text) {
  const slimErrors = [];
  const slimWarnings = [];
  const parsed = parseSlimHeader(file, text);

  if (!parsed) {
    slimErrors.push(`${file}: slim header detected but could not be parsed`);
    return { errors: slimErrors, warnings: slimWarnings };
  }

  if (!parsed.version) slimErrors.push(`${file}: missing @version`);
  if (!parsed.purpose) slimErrors.push(`${file}: missing @purpose`);
  if (!parsed.sidecar) slimErrors.push(`${file}: missing @sidecar`);
  if (!parsed.layer) slimErrors.push(`${file}: missing @layer`);
  if (parsed.public === null) slimErrors.push(`${file}: missing @public`);
  if (!parsed.edit) slimErrors.push(`${file}: missing @edit`);
  if (parsed.edit && !EDIT_POLICY_VALUES.has(parsed.edit)) {
    slimErrors.push(`${file}: invalid @edit value "${parsed.edit}"`);
  }

  // Check sidecar exists
  const sidecar = sidecarPath(file);
  if (!fileExists(sidecar)) {
    slimErrors.push(`${file}: sidecar ${sidecar} not found`);
  }

  return { errors: slimErrors, warnings: slimWarnings };
}

async function main() {
  const errors = [];
  const warnings = [];
  const allFiles = changedOnly ? await collectChangedTrackedFiles() : await collectTrackedFiles();
  const files = isScoped ? allFiles.filter(scopeFilter) : allFiles;

  for (const file of files) {
    if (isSidecarHeader(file)) continue;
    if (isHeaderExempt(file)) continue;

    if (commentStyle(file) === 'sidecar') {
      const sidecar = sidecarPath(file);
      if (!fileExists(sidecar)) {
        errors.push(
          new FileNotFoundError(`${file}: missing sidecar ${sidecar}`, { file: sidecar }),
        );
        continue;
      }

      const text = await readText(sidecar);
      // Sparse sidecar (post-migration) — just check it exists and is non-empty
      if (text.startsWith('---\n')) {
        // New sparse format — basic validation
        if (text.trim().length < 10) {
          errors.push(`${sidecar}: sparse sidecar is effectively empty`);
        }
        // F2: reject template filler in notesForLLM. See checkNotesForLLMFiller.
        const fillerCheck = checkNotesForLLMFiller(text);
        if (!fillerCheck.ok) {
          errors.push(
            `${sidecar}: notesForLLM contains template filler ("${fillerCheck.note}"; reason: ${fillerCheck.reason}). Either name a specific invariant, failure mode, or non-obvious gotcha in <25 words, or drop the field entirely.`,
          );
        }
        continue;
      }
      // Old heavy sidecar format — validate with old validator
      const checked = validateHeader(sidecar, text, { isSidecar: true });
      errors.push(...checked.errors);
      warnings.push(...checked.warnings);
      continue;
    }

    const text = await readText(file);

    // New slim header format (ADR-0009)
    if (hasSlimHeader(file, text)) {
      const checked = validateSlimHeader(file, text);
      errors.push(...checked.errors);
      warnings.push(...checked.warnings);
      continue;
    }

    // Old heavy header format — validate, but warn to migrate
    const checked = validateHeader(file, text);
    errors.push(...checked.errors);
    warnings.push(...checked.warnings);
    if (checked.parsed) {
      warnings.push(`${file}: uses old heavy header format — run header-migrate.mjs`);
    }
  }

  const output = result('header-check', errors.length === 0, errors, warnings, {
    mode: changedOnly ? 'changed' : 'repo',
    scoped: isScoped,
    fileCount: files.length,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  console.log(`header-check: ${output.ok ? 'OK' : 'FAIL'}`);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);

  if (!output.ok) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  main().catch((error) => {
    const output = result('header-check', false, [
      error instanceof Error ? error.message : String(error),
    ]);
    if (wantJson) console.log(JSON.stringify(output, null, 2));
    else console.error(output.errors[0]);
    process.exit(1);
  });
}
