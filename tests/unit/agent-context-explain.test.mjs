/* @HEADER
 * @version 0.7.108 | 2026-05-06
 * @purpose Unit tests for agent-context.mjs --explain flag (TPL-295).
 * @sidecar agent-context-explain.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-295

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExplainSection } from '../../scripts/agent-context.mjs';

const __dirname = import.meta.dirname ?? (import.meta.url ? fileURLToPath(import.meta.url).replace(/[/\\][^/\\]+$/, '') : process.cwd());
const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'agent-context.mjs');

const AUTH_FILE = 'modules/auth/domain/auth-state.mjs';

function run(args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}

// ---------------------------------------------------------------------------
// buildExplainSection — pure function unit tests
// ---------------------------------------------------------------------------

describe('buildExplainSection (unit)', () => {
  it('heading is "## Why this brief contains what it contains"', () => {
    const r = buildExplainSection({
      tier1Tokens: 100, tier2Tokens: 200, tier3Tokens: 150, tier4Tokens: 300,
      tier2Dropped: false, tier3Dropped: false, radius: 'medium',
    });
    assert.ok(
      r.includes('## Why this brief contains what it contains'),
      `explain section must have correct heading; got:\n${r}`
    );
  });

  it('all 4 tier names (Tier-1 through Tier-4) are present', () => {
    const r = buildExplainSection({
      tier1Tokens: 111, tier2Tokens: 222, tier3Tokens: 333, tier4Tokens: 444,
      tier2Dropped: false, tier3Dropped: false, radius: 'medium',
    });
    assert.match(r, /Tier-1/, 'must mention Tier-1');
    assert.match(r, /Tier-2/, 'must mention Tier-2');
    assert.match(r, /Tier-3/, 'must mention Tier-3');
    assert.match(r, /Tier-4/, 'must mention Tier-4');
  });

  it('token counts appear for each tier', () => {
    const r = buildExplainSection({
      tier1Tokens: 111, tier2Tokens: 222, tier3Tokens: 333, tier4Tokens: 444,
      tier2Dropped: false, tier3Dropped: false, radius: 'medium',
    });
    assert.match(r, /111/, 'tier1 token count must appear');
    assert.match(r, /222/, 'tier2 token count must appear');
    assert.match(r, /333/, 'tier3 token count must appear');
    assert.match(r, /444/, 'tier4 token count must appear');
  });

  it('tier3 line contains drop reason when tier3Dropped=true', () => {
    const r = buildExplainSection({
      tier1Tokens: 500, tier2Tokens: 400, tier3Tokens: 0, tier4Tokens: 300,
      tier2Dropped: false, tier3Dropped: true, radius: 'medium',
    });
    const lines = r.split('\n');
    const tier3Line = lines.find(l => /Tier-3/.test(l));
    assert.ok(tier3Line, 'must have a Tier-3 line');
    assert.match(
      tier3Line,
      /would have exceeded remaining budget|dropped|budget/i,
      `Tier-3 line must mention drop reason; got: ${tier3Line}`
    );
  });

  it('tier3 line contains radius when not dropped', () => {
    const r = buildExplainSection({
      tier1Tokens: 100, tier2Tokens: 200, tier3Tokens: 150, tier4Tokens: 300,
      tier2Dropped: false, tier3Dropped: false, radius: 'large',
    });
    assert.match(r, /radius=large/, 'tier3 line must show radius when not dropped');
  });
});

// ---------------------------------------------------------------------------
// --explain CLI flag integration
// ---------------------------------------------------------------------------

describe('--explain CLI flag', () => {
  it('without --explain: no explain section in output', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000']);
    assert.ok(
      !out.includes('## Why this brief contains what it contains'),
      'explain section must NOT appear without --explain flag'
    );
    assert.ok(out.includes('## Token budget'), '## Token budget must still appear');
  });

  it('with --explain: explain section appears before ## Token budget', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--explain']);
    const explainIdx = out.indexOf('## Why this brief contains what it contains');
    const budgetIdx = out.indexOf('## Token budget');
    assert.ok(explainIdx !== -1, 'explain section must be present with --explain');
    assert.ok(budgetIdx !== -1, '## Token budget must still be present');
    assert.ok(
      explainIdx < budgetIdx,
      `explain section (at ${explainIdx}) must appear before ## Token budget (at ${budgetIdx})`
    );
  });

  it('with --explain: all 4 tier names present with token counts (regex: Tier-1 ... tokens)', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--explain']);
    assert.match(out, /Tier-1/, 'Tier-1 must appear in explain section');
    assert.match(out, /Tier-2/, 'Tier-2 must appear in explain section');
    assert.match(out, /Tier-3/, 'Tier-3 must appear in explain section');
    assert.match(out, /Tier-4/, 'Tier-4 must appear in explain section');
    assert.match(out, /Tier-1.*\d+ tokens/, 'Tier-1 must include token count');
  });

  it('default markdown unchanged: two runs without --explain produce byte-identical output', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out1 = run([`--files=${AUTH_FILE}`, '--budget=16000']);
    const out2 = run([`--files=${AUTH_FILE}`, '--budget=16000']);
    assert.strictEqual(out1, out2, 'default markdown must be byte-stable (no --explain)');
  });
});
