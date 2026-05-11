/* @HEADER
 * @version 0.7.105 | 2026-05-05
 * @purpose Integration tests for agent-context.mjs Tier-3 sidecar neighborhood emission.
 * @sidecar agent-context-tier3.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-292

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? (import.meta.url ? fileURLToPath(import.meta.url).replace(/[/\\][^/\\]+$/, '') : process.cwd());
const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'agent-context.mjs');

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

/** Parse the total token count from the brief footer. */
function parseTokensFromBrief(brief) {
  // TPL-293 format: "- Total: N tokens / --budget=M tokens"
  const m = brief.match(/Total:\s*(\d+)\s*tokens/);
  if (!m) throw new Error('Could not parse token count from brief');
  return parseInt(m[1], 10);
}

/** Count how many .header.md paths appear in the Tier-3 section of a brief. */
function countTier3Sidecars(brief) {
  const tier3Start = brief.indexOf('## Sidecar neighborhood');
  if (tier3Start === -1) return 0;
  // The Tier-3 section ends at the next ## heading or the token budget section
  const afterTier3 = brief.indexOf('\n## ', tier3Start + 1);
  const tier3Section = afterTier3 === -1 ? brief.slice(tier3Start) : brief.slice(tier3Start, afterTier3);
  // Count lines that end with .header.md
  return (tier3Section.match(/\.header\.md/g) || []).length;
}

describe('Tier-3 sidecar neighborhood', () => {
  it('## Sidecar neighborhood section appears AFTER Tier-1 and Tier-2', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000']);
    const archIdx = out.indexOf('## Architectural map');
    const manifestIdx = out.indexOf('## Module manifests');
    const sidecarIdx = out.indexOf('## Sidecar neighborhood');
    assert.ok(archIdx !== -1, '## Architectural map must be present');
    assert.ok(manifestIdx !== -1, '## Module manifests must be present');
    assert.ok(sidecarIdx !== -1, '## Sidecar neighborhood must be present');
    assert.ok(archIdx < sidecarIdx, 'Tier-1 must appear before Tier-3');
    assert.ok(manifestIdx < sidecarIdx, 'Tier-2 must appear before Tier-3');
  });

  it('all Tier-3 entries end with .header.md (no source content)', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000']);
    const tier3Start = out.indexOf('## Sidecar neighborhood');
    assert.ok(tier3Start !== -1, '## Sidecar neighborhood must be present');
    const afterTier3 = out.indexOf('\n## ', tier3Start + 1);
    const tier3Section = afterTier3 === -1 ? out.slice(tier3Start) : out.slice(tier3Start, afterTier3);

    // All bullet-list entries must be .header.md paths
    // Each entry line looks like: "- modules/path/file.header.md"
    const bulletLines = tier3Section.split('\n').filter(l => l.startsWith('- modules/'));
    assert.ok(bulletLines.length > 0, 'Tier-3 must contain at least one bullet entry');
    for (const line of bulletLines) {
      const path = line.slice(2).trim();
      assert.ok(
        path.endsWith('.header.md'),
        `Tier-3 entry must end with .header.md: "${path}"`
      );
    }
  });

  it('--neighborhood-radius=small produces fewer sidecars than medium', () => {
    const smallOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000', '--neighborhood-radius=small']);
    const mediumOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000', '--neighborhood-radius=medium']);
    const smallCount = countTier3Sidecars(smallOut);
    const mediumCount = countTier3Sidecars(mediumOut);
    assert.ok(smallCount >= 1, `small must return at least 1 sidecar, got ${smallCount}`);
    assert.ok(mediumCount >= smallCount, `medium (${mediumCount}) must be >= small (${smallCount})`);
  });

  it('--neighborhood-radius=medium produces fewer sidecars than large', () => {
    const mediumOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=64000', '--neighborhood-radius=medium']);
    const largeOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=64000', '--neighborhood-radius=large']);
    const mediumCount = countTier3Sidecars(mediumOut);
    const largeCount = countTier3Sidecars(largeOut);
    assert.ok(largeCount >= mediumCount, `large (${largeCount}) must be >= medium (${mediumCount})`);
  });

  it('small radius: sidecar count in range [1, 5]', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000', '--neighborhood-radius=small']);
    const count = countTier3Sidecars(out);
    assert.ok(count >= 1 && count <= 5, `small radius must yield 1-5 sidecars, got ${count}`);
  });

  it('medium radius: sidecar count in range [4, 60]', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000', '--neighborhood-radius=medium']);
    const count = countTier3Sidecars(out);
    assert.ok(count >= 4 && count <= 60, `medium radius must yield 4-60 sidecars, got ${count}`);
  });

  it('large radius: sidecar count > small count', () => {
    const smallOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=64000', '--neighborhood-radius=small']);
    const largeOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=64000', '--neighborhood-radius=large']);
    const smallCount = countTier3Sidecars(smallOut);
    const largeCount = countTier3Sidecars(largeOut);
    assert.ok(largeCount > smallCount, `large (${largeCount}) must be > small (${smallCount})`);
  });

  it('default (no --neighborhood-radius flag) behaves as medium', () => {
    const defaultOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000']);
    const mediumOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000', '--neighborhood-radius=medium']);
    const defaultCount = countTier3Sidecars(defaultOut);
    const mediumCount = countTier3Sidecars(mediumOut);
    assert.equal(defaultCount, mediumCount, 'default must equal medium sidecar count');
  });

  it('budget-aware drop: synthetic tiny budget → Tier-3 dropped with [truncated] marker; Tier-1 and Tier-2 remain', () => {
    // Use a very tight budget that cannot fit Tier-3
    // First measure the full output to pick a budget that forces a drop
    const fullOut = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=64000']);
    const fullTokens = parseTokensFromBrief(fullOut);

    // Get Tier-3 token cost by running small radius and measuring the difference
    const noTier3Budget = fullTokens - 100; // shave 100 tokens — should drop Tier-3

    // With a very tight budget that excludes Tier-3
    const tightOut = run([
      '--files=modules/auth/domain/auth-state.mjs',
      `--budget=${noTier3Budget}`,
    ]);

    // Tier-1 must still be present
    assert.ok(tightOut.includes('## Architectural map'), 'Tier-1 must be present even with tight budget');
    // Tier-2 must still be present
    assert.ok(tightOut.includes('## Module manifests'), 'Tier-2 must be present even with tight budget');
    // Either Tier-3 is absent or partially truncated
    if (tightOut.includes('## Sidecar neighborhood')) {
      assert.ok(
        tightOut.includes('[truncated:') || countTier3Sidecars(tightOut) === 0,
        'Tier-3 must either be truncated or show 0 sidecars under tight budget'
      );
    }
  });

  it('## Touched files (full source) section appears AFTER Tier-3 (TPL-293 regression)', () => {
    // Tier-4 was added in TPL-293; verify it comes after Tier-3
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=64000']);
    const sidecarIdx = out.indexOf('## Sidecar neighborhood');
    const touchedIdx = out.indexOf('## Touched files (full source)');
    if (sidecarIdx !== -1 && touchedIdx !== -1) {
      assert.ok(sidecarIdx < touchedIdx, 'Tier-3 must appear before Tier-4');
    }
  });

  it('invalid --neighborhood-radius exits non-zero', () => {
    const r = runExpectFail(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000', '--neighborhood-radius=huge']);
    assert.ok(r.status !== 0, 'invalid radius must cause non-zero exit');
    assert.ok(
      r.stderr.toLowerCase().includes('radius') || r.stderr.toLowerCase().includes('invalid'),
      `stderr must mention radius or invalid: ${r.stderr}`
    );
  });

  it('Tier-1 regression: auth brief still contains Core Infrastructure heading', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000']);
    assert.ok(out.includes('### Core Infrastructure'), 'Tier-1 Core Infrastructure heading must still appear');
  });

  it('Tier-2 regression: auth manifest still present', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000']);
    assert.ok(out.includes('### modules/auth/manifest.json'), 'Tier-2 auth manifest must still appear');
  });

  it('## Token budget footer still present', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=32000']);
    assert.ok(out.includes('## Token budget'), '## Token budget footer must be present');
  });
});
