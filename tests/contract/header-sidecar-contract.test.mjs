/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the stable repository contracts around sidecar naming and FileId namespace usage.
 * @sidecar header-sidecar-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { allowedFileIdPrefixes, repoFileIdPrefix } from '../../scripts/checks/_shared.mjs';

const PREFIX = repoFileIdPrefix();
const ALLOWED_PREFIXES = allowedFileIdPrefixes();
const sidecars = [
  'package.json.header.md',
  '.claude/settings.json.header.md',
  '.vscode/tasks.json.header.md',
  '.vscode/settings.json.header.md',
  '.vscode/extensions.json.header.md',
];

function read(rel) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
}

test('required JSON sidecars exist and contain metadata', () => {
  for (const rel of sidecars) {
    assert.ok(existsSync(new URL(`../../${rel}`, import.meta.url)), `expected ${rel}`);
    const text = read(rel);
    // Accept both old format (@HEADER-START + SidecarFor) and new sparse format (YAML frontmatter)
    const hasOld = /^<!-- @HEADER-START/m.test(text) && /SidecarFor:\s*`?.+`?/m.test(text);
    const hasSparse = /^---\n/.test(text);
    assert.ok(hasOld || hasSparse, `expected header metadata in ${rel}`);
  }
});

test('key script headers use the repo-local FileId namespace', () => {
  for (const rel of [
    'scripts/checks/_shared.mjs',
    'scripts/checks/header-create.mjs',
    'scripts/checks/header-fix.mjs',
    'scripts/checks/changelog-sync.mjs',
  ]) {
    // Check inline source for old-format FileId, or sidecar for new-format fileId
    const text = read(rel);
    const hasOldFileId = ALLOWED_PREFIXES.some((prefix) => text.includes(`FileId: ${prefix}`));

    let hasSidecarFileId = false;
    const sidecarRel = `${rel}.header.md`;
    if (existsSync(new URL(`../../${sidecarRel}`, import.meta.url))) {
      const sidecarText = read(sidecarRel);
      hasSidecarFileId = ALLOWED_PREFIXES.some((prefix) =>
        sidecarText.includes(`fileId: ${prefix}`),
      );
    }

    assert.ok(
      hasOldFileId || hasSidecarFileId,
      `expected allowed repo prefix in ${rel} or its sidecar`,
    );
  }
});
