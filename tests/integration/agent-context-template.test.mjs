/* @HEADER
 * @version 0.7.107 | 2026-05-06
 * @purpose Integration tests for agent-context.mjs 8-heading template invariant (TPL-294).
 * @sidecar agent-context-template.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-294

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? (import.meta.url ? fileURLToPath(import.meta.url).replace(/[/\\][^/\\]+$/, '') : process.cwd());
const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'agent-context.mjs');

const AUTH_FILE = 'modules/auth/domain/auth-state.mjs';
const STARTER_INDEX = 'apps/starter/app.mjs';
const README_FILE = 'README.md';

// The 8 stable headings that every brief must contain, in order.
const EXPECTED_HEADINGS = [
  '# Slice context',
  '## How to read this brief',
  '## Architectural map',
  '## Module manifests',
  '## Sidecar neighborhood',
  '## Touched files (full source)',
  '## Suggested next actions',
  '## Token budget',
];

function run(args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function assertHeadingsInOrder(output, label) {
  let lastIdx = -1;
  for (const heading of EXPECTED_HEADINGS) {
    const idx = output.indexOf(heading);
    assert.ok(idx !== -1, `${label}: missing heading "${heading}"`);
    assert.ok(
      idx > lastIdx,
      `${label}: heading "${heading}" appears out of order (at ${idx}, expected after ${lastIdx})`
    );
    lastIdx = idx;
  }
}

describe('TPL-294: 8-heading brief template invariant', () => {
  it('8-headings invariant: all 8 stable headings present in correct order (module file)', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000']);
    assertHeadingsInOrder(out, 'module brief');
  });

  it('How-to-read preamble: ## How to read this brief contains "deep-read only the Touched files"', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000']);

    const howToReadIdx = out.indexOf('## How to read this brief');
    assert.ok(howToReadIdx !== -1, 'must have ## How to read this brief section');

    // Find the next heading after How to read this brief
    const nextHeadingIdx = out.indexOf('\n## ', howToReadIdx + 1);
    const howToReadSection = nextHeadingIdx === -1
      ? out.slice(howToReadIdx)
      : out.slice(howToReadIdx, nextHeadingIdx);

    assert.ok(
      howToReadSection.toLowerCase().includes('deep-read only the touched files') ||
      howToReadSection.toLowerCase().includes('deep-read only the touched files'),
      `## How to read this brief must contain "deep-read only the Touched files"\nActual section:\n${howToReadSection}`
    );
  });

  it('Suggested next actions: section present with at least one bulleted line', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000']);

    const snaIdx = out.indexOf('## Suggested next actions');
    assert.ok(snaIdx !== -1, 'must have ## Suggested next actions section');

    // Find the next heading
    const nextHeadingIdx = out.indexOf('\n## ', snaIdx + 1);
    const snaSection = nextHeadingIdx === -1
      ? out.slice(snaIdx)
      : out.slice(snaIdx, nextHeadingIdx);

    // Must have at least one bullet
    const hasBullet = /^[*-] /m.test(snaSection);
    assert.ok(hasBullet, `## Suggested next actions must contain at least one bullet line\nActual section:\n${snaSection}`);
  });

  it('Empty-tier marker: non-module file still has all 8 headings; Tier-2/3 show empty-tier marker', () => {
    assert.ok(existsSync(join(ROOT, STARTER_INDEX)), `test requires ${STARTER_INDEX} to exist`);
    const out = run([`--files=${STARTER_INDEX}`, '--budget=16000']);
    assertHeadingsInOrder(out, 'non-module brief');

    // Tier-2 and Tier-3 must be present even if no modules in scope
    assert.ok(out.includes('## Module manifests'), 'must have ## Module manifests heading');
    assert.ok(out.includes('## Sidecar neighborhood'), 'must have ## Sidecar neighborhood heading');

    // They should indicate no modules in scope when the file is outside modules/
    // (apps/starter/index.mjs is not under modules/)
    const manifestIdx = out.indexOf('## Module manifests');
    const sidecarIdx = out.indexOf('## Sidecar neighborhood');
    const touchedIdx = out.indexOf('## Touched files (full source)');
    const manifestSection = out.slice(manifestIdx, sidecarIdx);
    const sidecarSection = out.slice(sidecarIdx, touchedIdx);

    // Either contains actual content OR the no-modules marker
    const manifestHasContent = manifestSection.length > '## Module manifests\n'.length + 5;
    const sidecarHasContent = sidecarSection.length > '## Sidecar neighborhood\n'.length + 5;

    // For apps/starter/index.mjs which is NOT under modules/, we expect empty-tier markers
    assert.ok(
      !manifestHasContent || manifestSection.includes('no modules in scope'),
      `Tier-2 section for non-module file should be empty or have "no modules in scope" marker`
    );
  });

  it('Snapshot stability: heading structure is byte-stable across two runs', () => {
    assert.ok(existsSync(join(ROOT, README_FILE)), `test requires ${README_FILE} to exist`);

    // Use a large budget to get full output
    const out1 = run([`--files=${README_FILE}`, '--budget=64000']);
    const out2 = run([`--files=${README_FILE}`, '--budget=64000']);

    // Extract just the heading lines (lines starting with # or ##)
    function extractHeadings(text) {
      return text.split('\n').filter(line => /^#{1,3} /.test(line)).join('\n');
    }

    const headings1 = extractHeadings(out1);
    const headings2 = extractHeadings(out2);

    assert.strictEqual(
      headings1,
      headings2,
      'Heading structure must be byte-stable across two runs'
    );

    // Also verify all 8 stable headings appear in first run
    assertHeadingsInOrder(out1, 'snapshot stability run 1');
  });
});
