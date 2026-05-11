/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Generate a machine-readable spec index from trace-yaml blocks
 * @sidecar spec-sync.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { collectWorkItems, ensureWriteIfChanged, parseArgs, readText, result } from './_shared.mjs';
import { ValidationError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const checkOnly = args.has('--check');
const OUT = 'docs/_generated/spec-index.json';

function groupBy(items, key) {
  const out = {};
  for (const item of items) {
    const value = item[key] || '_none_';
    out[value] ||= [];
    out[value].push(item.id);
  }
  for (const key of Object.keys(out)) out[key].sort();
  return out;
}

async function main() {
  const items = await collectWorkItems();
  const payload = {
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    projectKey: items[0]?.id?.split('-')?.[0] ?? null,
    byType: groupBy(items, 'type'),
    byStatus: groupBy(items, 'status'),
    byModule: groupBy(items, 'module_ref'),
    items,
  };
  // Compare substantive content (without generatedAt) to avoid timestamp-only rewrites.
  // This prevents dirty working tree in parallel sessions where nothing changed.
  const current = await readText(OUT).catch(() => null);
  let changed = true;
  if (current) {
    try {
      const prev = JSON.parse(current);
      const { generatedAt: _a, ...prevSub } = prev;
      const { generatedAt: _b, ...curSub } = payload;
      changed = JSON.stringify(prevSub) !== JSON.stringify(curSub);
    } catch { /* parse error → treat as changed */ }
  }
  if (!changed) payload.generatedAt = JSON.parse(current).generatedAt; // keep old timestamp
  const content = JSON.stringify(payload, null, 2) + '\n';
  if (!checkOnly) await ensureWriteIfChanged(OUT, content);

  const errors = checkOnly && changed ? [new ValidationError(`${OUT} is out of date`)] : [];
  const output = result('spec-sync', errors.length === 0, errors, [], {
    outputFile: OUT,
    changed,
    itemCount: items.length,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }
  if (!output.ok) {
    console.error(errors[0]?.message ?? output.errors[0]);
    process.exit(1);
  }
  console.log(`${checkOnly ? 'checked' : 'wrote'} ${OUT}`);
}

main().catch((error) => {
  const output = result('spec-sync', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
