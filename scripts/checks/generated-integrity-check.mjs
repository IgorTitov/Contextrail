/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify generated files match their source by comparing content hashes against a stored manifest.
 * @sidecar generated-integrity-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ROOT, parseArgs } from './_shared.mjs';

const MANIFEST_PATH = join(ROOT, 'docs/_generated/integrity-manifest.json');

const args = parseArgs();
const updateMode = args.has('--update');
const checkMode = args.has('--check') || !updateMode;

/** Files that are generated from a canonical source and should not be hand-edited. */
const GENERATED_FILES = [
  'AGENTS.md',
  '.cursorrules',
  '.agents/README.md',
  '.agents/skills/README.md',
  'docs/_generated/dependency-graph.json',
  'docs/_generated/module-capabilities.json',
];

async function hashFile(relPath) {
  try {
    const content = await readFile(join(ROOT, relPath), 'utf8');
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const current = {};
  for (const f of GENERATED_FILES) {
    const hash = await hashFile(f);
    if (hash) current[f] = hash;
  }

  if (updateMode) {
    const manifest = {
      generatedAt: new Date().toISOString(),
      description:
        'SHA-256 hashes of generated files. Run with --update after sync.mjs to refresh.',
      files: current,
    };
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(
      `generated-integrity-check --update: ${Object.keys(current).length} file hashes stored`,
    );
    return;
  }

  // Check mode
  const manifest = await loadManifest();
  const stored = manifest.files || {};
  const mismatches = [];
  const missing = [];

  for (const f of GENERATED_FILES) {
    if (!stored[f]) {
      missing.push(f);
      continue;
    }
    if (!current[f]) {
      missing.push(f);
      continue;
    }
    if (current[f] !== stored[f]) {
      mismatches.push(f);
    }
  }

  if (mismatches.length > 0) {
    console.error(
      `generated-integrity-check: ${mismatches.length} file(s) differ from stored hashes:`,
    );
    for (const f of mismatches) console.error(`  MISMATCH: ${f}`);
    console.error(
      'Run "node scripts/agent-contract/sync.mjs" then "node scripts/checks/generated-integrity-check.mjs --update"',
    );
    process.exit(1);
  }

  if (missing.length > 0 && Object.keys(stored).length > 0) {
    console.log(
      `generated-integrity-check: WARN — ${missing.length} file(s) not in manifest: ${missing.join(', ')}`,
    );
  }

  console.log(
    `generated-integrity-check: OK — ${GENERATED_FILES.length - missing.length} file(s) verified`,
  );
}

main();
