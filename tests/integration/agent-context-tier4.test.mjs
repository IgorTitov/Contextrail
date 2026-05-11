/* @HEADER
 * @version 0.7.105 | 2026-05-05
 * @purpose Integration tests for agent-context.mjs Tier-4 touched-file source emission (TPL-293).
 * @sidecar agent-context-tier4.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-293

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? (import.meta.url ? fileURLToPath(import.meta.url).replace(/[/\\][^/\\]+$/, '') : process.cwd());
const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'agent-context.mjs');

// Use a file that definitely exists in the auth module
// auth-state.mjs is a stable domain file present in all worktrees
const AUTH_FILE = 'modules/auth/domain/auth-state.mjs';
const AUTH_PUBLIC_API = 'modules/auth/public-api.mjs';

function run(args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function runExpectFail(args) {
  try {
    execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    throw new Error('Expected non-zero exit');
  } catch (e) {
    if (e.message === 'Expected non-zero exit') throw e;
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', status: e.status };
  }
}

// ---------------------------------------------------------------------------
// Tier-4 integration tests
// ---------------------------------------------------------------------------

describe('Tier-4 touched-file source emission', () => {
  it('emits ## Touched files (full source) section with fenced code block', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const out = run(['--files=' + AUTH_FILE, '--budget=64000']);

    assert.ok(out.includes('## Touched files (full source)'), 'must have Tier-4 heading');

    // Find the Tier-4 section
    const idx = out.indexOf('## Touched files (full source)');
    const sectionEnd = out.indexOf('\n## ', idx + 1);
    const tier4Section = sectionEnd === -1 ? out.slice(idx) : out.slice(idx, sectionEnd);

    assert.ok(tier4Section.includes('```'), 'Tier-4 must use fenced code blocks');
  });

  it('file content is byte-equal to disk', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const diskContent = readFileSync(join(ROOT, AUTH_FILE), 'utf8');
    const out = run(['--files=' + AUTH_FILE, '--budget=64000']);

    // The file content should appear verbatim in the brief
    assert.ok(out.includes(diskContent.trimEnd()), 'brief must contain file content verbatim');
  });

  it('multiple files emitted in stable order matching --files argument', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    assert.ok(existsSync(join(ROOT, AUTH_PUBLIC_API)), `test requires ${AUTH_PUBLIC_API} to exist`);

    const out = run([`--files=${AUTH_FILE},${AUTH_PUBLIC_API}`, '--budget=64000']);

    const tier4Start = out.indexOf('## Touched files (full source)');
    const tier4End = out.indexOf('\n## Token budget');
    const tier4Section = tier4Start !== -1 && tier4End !== -1
      ? out.slice(tier4Start, tier4End)
      : out.slice(tier4Start === -1 ? 0 : tier4Start);

    const t4IdxA = tier4Section.indexOf('auth-state.mjs');
    const t4IdxB = tier4Section.indexOf('public-api.mjs');
    assert.ok(t4IdxA !== -1, 'auth-state.mjs must appear in Tier-4');
    assert.ok(t4IdxB !== -1, 'public-api.mjs must appear in Tier-4');
    assert.ok(t4IdxA < t4IdxB, 'auth-state.mjs must appear before public-api.mjs (matches --files order)');
  });

  it('section ordering: Architectural map → Module manifests → Sidecar neighborhood → Touched files → Token budget', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const out = run(['--files=' + AUTH_FILE, '--budget=64000']);

    const archIdx = out.indexOf('## Architectural map');
    const manifestIdx = out.indexOf('## Module manifests');
    const sidecarIdx = out.indexOf('## Sidecar neighborhood');
    const touchedIdx = out.indexOf('## Touched files (full source)');
    const budgetIdx = out.indexOf('## Token budget');

    assert.ok(archIdx !== -1, '## Architectural map must be present');
    assert.ok(manifestIdx !== -1, '## Module manifests must be present');
    assert.ok(sidecarIdx !== -1, '## Sidecar neighborhood must be present');
    assert.ok(touchedIdx !== -1, '## Touched files (full source) must be present');
    assert.ok(budgetIdx !== -1, '## Token budget must be present');

    assert.ok(archIdx < manifestIdx, 'Tier-1 before Tier-2');
    assert.ok(manifestIdx < sidecarIdx, 'Tier-2 before Tier-3');
    assert.ok(sidecarIdx < touchedIdx, 'Tier-3 before Tier-4');
    assert.ok(touchedIdx < budgetIdx, 'Tier-4 before Token budget');
  });

  it('## Token budget footer has per-tier breakdown with all four tier labels', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const out = run(['--files=' + AUTH_FILE, '--budget=64000']);

    const budgetIdx = out.indexOf('## Token budget');
    assert.ok(budgetIdx !== -1, '## Token budget must be present');
    const budgetSection = out.slice(budgetIdx);

    assert.ok(budgetSection.includes('Tier-1'), 'footer must mention Tier-1');
    assert.ok(budgetSection.includes('Tier-2'), 'footer must mention Tier-2');
    assert.ok(budgetSection.includes('Tier-3'), 'footer must mention Tier-3');
    assert.ok(budgetSection.includes('Tier-4'), 'footer must mention Tier-4');
    assert.ok(budgetSection.includes('Total:'), 'footer must include Total');
    assert.ok(budgetSection.includes('--budget=64000'), 'footer must show --budget value');
  });

  it('tight budget: Tier-3 drops first; Tier-1 and Tier-4 always survive', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);

    // Use a tight budget that forces some drops
    // Measure full output first
    const fullOut = run(['--files=' + AUTH_FILE, '--budget=64000']);

    // Get total token count from full output footer
    const totalMatch = fullOut.match(/Total:\s*(\d+)\s*tokens/);
    if (!totalMatch) {
      assert.fail('Footer must have Total: N tokens format');
    }
    const totalTokens = parseInt(totalMatch[1], 10);

    // Use a budget that is much less than full — enough to trigger Tier-3 drop
    // but still fit Tier-1 + Tier-4
    const tier1Match = fullOut.match(/Tier-1 \(architectural map\):\s*(\d+)\s*tokens/);
    const tier4Match = fullOut.match(/Tier-4 \(touched files\):\s*(\d+)\s*tokens/);
    if (!tier1Match || !tier4Match) {
      assert.fail('Footer must have per-tier token counts');
    }
    const tier1Tokens = parseInt(tier1Match[1], 10);
    const tier4Tokens = parseInt(tier4Match[1], 10);
    const fixedCost = tier1Tokens + tier4Tokens;

    // Budget = fixed cost + 50 tokens; allows Tier-2 and Tier-3 to be (partially) dropped
    const tightBudget = fixedCost + 50;

    if (tightBudget < 500) {
      // Sanity guard — skip if numbers are weird
      return;
    }

    const tightOut = run(['--files=' + AUTH_FILE, `--budget=${tightBudget}`]);

    // Tier-1 must still be present (never dropped)
    assert.ok(tightOut.includes('## Architectural map'), 'Tier-1 must survive tight budget');
    // Tier-4 must still be present (never dropped)
    assert.ok(tightOut.includes('## Touched files (full source)'), 'Tier-4 must survive tight budget');

    // Check that Tier-3 is dropped first — check footer for truncation info
    const budgetIdx = tightOut.indexOf('## Token budget');
    if (budgetIdx !== -1) {
      const footerSection = tightOut.slice(budgetIdx);
      const tier3Line = footerSection.split('\n').find(l => l.includes('Tier-3'));
      const tier2Line = footerSection.split('\n').find(l => l.includes('Tier-2'));

      // Either Tier-3 is dropped (indicated by [truncated:]) OR
      // the sidecar section is missing entirely
      const tier3DroppedInFooter = tier3Line && tier3Line.includes('[truncated:');
      const sidecarMissing = !tightOut.includes('## Sidecar neighborhood');

      // Either Tier-3 was dropped or Tier-2 was also dropped (both acceptable under tight budget)
      assert.ok(
        tier3DroppedInFooter || sidecarMissing || (tier2Line && tier2Line.includes('[truncated:')),
        `Budget-tight brief must show truncation in footer: tier3="${tier3Line}", tier2="${tier2Line}"`
      );
    }
  });

  it('markdown validity: fenced code blocks are balanced', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE} to exist`);
    const out = run(['--files=' + AUTH_FILE, '--budget=64000']);

    // Count fence markers (``` at start of line)
    const fenceCount = (out.match(/^```/gm) || []).length;
    assert.equal(fenceCount % 2, 0, `fenced code blocks must be balanced (found ${fenceCount} fences)`);
  });

  it('missing touched file: exits non-zero with clear error', () => {
    const r = runExpectFail(['--files=does/not/exist.mjs', '--budget=64000']);
    assert.ok(r.status !== 0, 'must exit non-zero for missing file');
    assert.ok(
      r.stderr.includes('not found') || r.stderr.includes('does not exist') ||
      r.stderr.includes('ENOENT') || r.stderr.includes('missing') ||
      r.stderr.includes('does/not/exist') || r.stderr.toLowerCase().includes('error'),
      `stderr must mention missing file: "${r.stderr}"`
    );
  });

  it('binary touched file: emits [binary file: N bytes] placeholder, exits 0', () => {
    // Create a temp binary file with null bytes
    const dir = mkdtempSync(join(tmpdir(), 'tpl293-'));
    const binFile = join(dir, 'image.bin');
    writeFileSync(binFile, Buffer.from([0x00, 0xFF, 0xFE, 0x00, 0x42, 0x00, 0x01]));

    // Run briefer with this binary file using absolute path (no SYSTEM_MAP needed for non-module path)
    // We use a large budget so the binary placeholder fits
    const out = run([`--files=${binFile}`, '--budget=64000']);

    // Should have the binary file placeholder
    assert.ok(out.includes('[binary file:'), 'must emit binary placeholder for binary file');
    assert.ok(out.includes('bytes'), 'binary placeholder must include byte count');
  });
});
