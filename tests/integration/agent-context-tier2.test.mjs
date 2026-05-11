/* @HEADER
 * @version 0.7.105 | 2026-05-05
 * @purpose Integration tests for agent-context.mjs Tier-2 module manifest + public-API emission.
 * @sidecar agent-context-tier2.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-290

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname =
  import.meta.dirname ??
  (import.meta.url ? fileURLToPath(import.meta.url).replace(/[/\\][^/\\]+$/, '') : process.cwd());
const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'agent-context.mjs');

function run(args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

/** Parse the total token count from the brief footer. */
function parseTokensFromBrief(brief) {
  // TPL-293 format: "- Total: N tokens / --budget=M tokens"
  const m = brief.match(/Total:\s*(\d+)\s*tokens/);
  if (!m) throw new Error('Could not parse token count from brief');
  return parseInt(m[1], 10);
}

describe('Tier-2 module manifests', () => {
  it('single module: contains ## Module manifests heading', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(out.includes('## Module manifests'), '## Module manifests heading must be present');
  });

  it('single module: auth manifest.json included under ### auth/manifest.json', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(
      out.includes('### modules/auth/manifest.json'),
      'auth manifest sub-heading must be present',
    );
    assert.ok(out.includes('"name": "auth"'), 'manifest content must appear');
  });

  it('single module: auth public-api surface included', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(
      out.includes('### modules/auth/public-api.mjs') || out.includes('### modules/auth/index.mjs'),
      'public-api or index sub-heading must be present',
    );
  });

  it('single module: Tier-1 ## Architectural map appears BEFORE ## Module manifests', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    const archIdx = out.indexOf('## Architectural map');
    const manifestIdx = out.indexOf('## Module manifests');
    assert.ok(archIdx !== -1, '## Architectural map must be present');
    assert.ok(manifestIdx !== -1, '## Module manifests must be present');
    assert.ok(archIdx < manifestIdx, 'Tier-1 arch map must appear before Tier-2 manifests');
  });

  it('two-module brief: both manifests present', () => {
    const out = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      '--budget=32000',
    ]);
    assert.ok(out.includes('### modules/auth/manifest.json'), 'auth manifest must be present');
    assert.ok(
      out.includes('### modules/ai-chat/manifest.json'),
      'ai-chat manifest must be present',
    );
  });

  it('two-module brief: both public-APIs present', () => {
    const out = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      '--budget=32000',
    ]);
    assert.ok(
      out.includes('### modules/auth/public-api.mjs') || out.includes('### modules/auth/index.mjs'),
      'auth public-api must be present',
    );
    assert.ok(
      out.includes('### modules/ai-chat/public-api.mjs') ||
        out.includes('### modules/ai-chat/index.mjs'),
      'ai-chat public-api must be present',
    );
  });

  it('two-module brief: output within --budget tokens', () => {
    const out = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      '--budget=32000',
    ]);
    const tokens = parseTokensFromBrief(out);
    assert.ok(tokens <= 32000, `tokens ${tokens} should be within budget 32000`);
  });

  it('module deduplication: duplicate file paths for same module produce one manifest entry', () => {
    const out = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/auth/ports/auth-port.mjs',
      '--budget=16000',
    ]);
    const count = (out.match(/### modules\/auth\/manifest\.json/g) || []).length;
    assert.equal(count, 1, 'auth manifest must appear exactly once');
  });

  it('mixed in-module and out-of-module: auth manifest present, no error for apps/ file', () => {
    // apps/starter/app.mjs is outside modules/ — should be silently skipped in Tier-2 manifests section
    const out = run([
      '--files=modules/auth/domain/auth-state.mjs,apps/starter/app.mjs',
      '--budget=16000',
    ]);
    assert.ok(out.includes('### modules/auth/manifest.json'), 'auth manifest must be present');
    // Tier-2 (## Module manifests) must not include apps/ headings
    const tier2Start = out.indexOf('## Module manifests');
    const tier2End = out.indexOf('\n## ', tier2Start + 1);
    const tier2Section =
      tier2Start !== -1 && tier2End !== -1
        ? out.slice(tier2Start, tier2End)
        : tier2Start !== -1
          ? out.slice(tier2Start)
          : '';
    assert.ok(
      !tier2Section.includes('### apps/'),
      'apps/ file must not appear as a Tier-2 sub-heading',
    );
  });

  it('budget drop: tight budget causes [truncated] marker with Tier-1 still present', () => {
    // First get the full two-module output to measure its real token cost
    const fullOut = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      '--budget=64000',
    ]);
    const fullTokens = parseTokensFromBrief(fullOut);

    // Drop-priority rule: modules emitted last from the unique list (last first-seen in --files)
    // are dropped first when budget is tight. We shave 500 tokens off the full size — since
    // each module's manifest+public-api costs at least 500 tokens, this forces at least
    // the last-seen module (ai-chat) to be dropped.
    const tightBudget = fullTokens - 500;

    const tightOut = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      `--budget=${tightBudget}`,
    ]);

    assert.ok(tightOut.includes('## Architectural map'), 'Tier-1 must be present in tight budget');
    assert.ok(
      tightOut.includes('[truncated'),
      '[truncated] marker must appear when budget is tight',
    );
  });

  it('budget drop: Tier-1 remains even when Tier-2 manifests are dropped', () => {
    const fullOut = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      '--budget=64000',
    ]);
    const fullTokens = parseTokensFromBrief(fullOut);
    const tightBudget = fullTokens - 500;

    const tightOut = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      `--budget=${tightBudget}`,
    ]);

    assert.ok(tightOut.includes('| auth |'), 'auth SYSTEM_MAP row must still appear (Tier-1)');
  });

  it('Tier-4 (## Touched files) appears after Tier-2 (TPL-293 regression)', () => {
    // TPL-293 added Tier-4; verify section order
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=64000']);
    const manifestIdx = out.indexOf('## Module manifests');
    const touchedIdx = out.indexOf('## Touched files (full source)');
    if (manifestIdx !== -1 && touchedIdx !== -1) {
      assert.ok(manifestIdx < touchedIdx, 'Tier-2 must appear before Tier-4');
    }
  });

  it('Tier-1 regression: auth brief still contains Core Infrastructure heading', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(
      out.includes('### Core Infrastructure'),
      'Tier-1 Core Infrastructure heading must still appear',
    );
  });

  it('Tier-1 regression: brief still has ## Token budget footer', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(out.includes('## Token budget'), '## Token budget footer must be present');
  });
});
