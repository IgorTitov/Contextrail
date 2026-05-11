/* @HEADER
 * @version 0.7.105 | 2026-05-05
 * @purpose Integration tests for agent-context.mjs Tier-1 SYSTEM_MAP fragment emission.
 * @sidecar agent-context-tier1.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

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

describe('Tier-1 fragment selection', () => {
  it('auth module emits Core Infrastructure heading', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(
      out.includes('### Core Infrastructure'),
      'should include Core Infrastructure heading',
    );
    assert.ok(out.includes('| auth |'), 'should include auth row');
  });

  it('auth module does not emit AI & Retrieval heading', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(!out.includes('### AI & Retrieval'), 'should not include AI & Retrieval heading');
  });

  it('multi-module includes both categories', () => {
    const out = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      '--budget=16000',
    ]);
    assert.ok(out.includes('### Core Infrastructure'), 'should include Core Infrastructure');
    assert.ok(out.includes('### AI & Retrieval'), 'should include AI & Retrieval');
  });

  it('output fits within budget tokens', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    const tokens = Math.ceil(Buffer.byteLength(out, 'utf8') / 4);
    assert.ok(tokens <= 16000, `tokens ${tokens} should be <= 16000`);
  });

  it('sections appear in SYSTEM_MAP source order', () => {
    const out = run([
      '--files=modules/auth/domain/auth-state.mjs,modules/ai-chat/domain/message-history.mjs',
      '--budget=16000',
    ]);
    const coreIdx = out.indexOf('### Core Infrastructure');
    const aiIdx = out.indexOf('### AI & Retrieval');
    assert.ok(coreIdx < aiIdx, 'Core Infrastructure should appear before AI & Retrieval');
  });

  it('unknown module exits non-zero with clear error', () => {
    const r = runExpectFail(['--files=modules/nonexistent/foo.mjs', '--budget=16000']);
    assert.ok(r.status !== 0);
    assert.ok(
      r.stderr.includes('not in SYSTEM_MAP') || r.stderr.includes('nonexistent'),
      `stderr: ${r.stderr}`,
    );
  });

  it('output has top-level heading', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(out.includes('# Slice context'), 'should have # Slice context heading');
  });

  it('output has token budget footer', () => {
    const out = run(['--files=modules/auth/domain/auth-state.mjs', '--budget=16000']);
    assert.ok(out.includes('## Token budget'), 'should have ## Token budget footer');
  });
});
