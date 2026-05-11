/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that header creation and repair stamp the current repository version rather than preserving file-local pseudo-version values.
 * @sidecar header-version-stamp.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  defaultHeaderData,
  injectInlineHeader,
  mergeExistingSemanticData,
  parseStructuredHeaderText,
  repoVersion,
  hasSlimHeader,
  parseSlimHeader,
  injectSlimHeader,
  inferLayer,
  inferHexLayer,
  inferBoundedContext,
  inferPublic,
  sidecarPath,
  EDIT_POLICY_VALUES,
} from '../../scripts/checks/_shared.mjs';
import path from 'node:path';

function read(rel) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
}

test('default header data stamps the current repository version', () => {
  assert.equal(defaultHeaderData('docs/example.md').version, repoVersion());
});

test('header-fix-style normalization rewrites a stale version line to the current repository version', () => {
  const rel = 'docs/adr/0002-trunk-based-delivery.md';
  const current = read(rel);
  const staleVersion = repoVersion() === '0.1.0' ? '0.0.0' : '0.1.0';
  const stale = current.replace(
    /@version\s+\S+\s+\|\s+\d{4}-\d{2}-\d{2}/,
    `@version ${staleVersion} | 2026-03-21`,
  );

  if (hasSlimHeader(rel, current)) {
    // Slim header path
    const parsed = parseSlimHeader(rel, stale);
    const slimData = {
      version: repoVersion(),
      purpose: parsed?.purpose || 'Test',
      sidecar: parsed?.sidecar || path.basename(sidecarPath(rel)),
      layer: parsed?.layer || inferLayer(rel),
      hex: parsed?.hex || inferHexLayer(rel),
      ctx: parsed?.ctx || inferBoundedContext(rel),
      public: parsed?.public || inferPublic(rel),
      edit: parsed?.edit && EDIT_POLICY_VALUES.has(parsed.edit) ? parsed.edit : 'careful',
    };
    const repaired = injectSlimHeader(rel, stale, slimData);
    assert.match(repaired, new RegExp(`@version ${repoVersion().replace(/\./g, '\\.')} \\|`));
    assert.doesNotMatch(repaired, new RegExp(`@version ${staleVersion.replace(/\./g, '\\.')} \\|`));
  } else {
    // Old heavy header path
    const parsed = parseStructuredHeaderText(rel, stale);
    const nextData = {
      ...mergeExistingSemanticData(parsed, defaultHeaderData(rel)),
      version: repoVersion(),
    };
    const repaired = injectInlineHeader(rel, stale, nextData);
    assert.match(repaired, new RegExp(`version ${repoVersion().replace(/\./g, '\\.')} \\|`));
    assert.doesNotMatch(repaired, new RegExp(`version ${staleVersion.replace(/\./g, '\\.')} \\|`));
  }
});
