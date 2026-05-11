/* @HEADER
 * @version 0.7.99 | 2026-05-05
 * @purpose Unit tests for agent-context.mjs arg parsing.
 * @sidecar agent-context-args.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs, resolveBudget } from '../../scripts/agent-context.mjs';

describe('parseArgs', () => {
  it('defaults: profile=mid, budget=16000, out=-', () => {
    const r = parseArgs([]);
    assert.equal(r.profile, 'mid');
    assert.equal(r.budget, 16000);
    assert.equal(r.out, '-');
  });

  it('--profile=small resolves to 12000', () => {
    const r = parseArgs(['--profile=small']);
    assert.equal(r.budget, 12000);
  });

  it('--profile=mid resolves to 16000', () => {
    const r = parseArgs(['--profile=mid']);
    assert.equal(r.budget, 16000);
  });

  it('--profile=frontier resolves to 64000', () => {
    const r = parseArgs(['--profile=frontier']);
    assert.equal(r.budget, 64000);
  });

  it('--budget=20000 overrides profile', () => {
    const r = parseArgs(['--profile=small', '--budget=20000']);
    assert.equal(r.budget, 20000);
  });

  it('--files parses comma-separated list', () => {
    const r = parseArgs([
      '--files=modules/auth/domain/session.mjs,modules/ai-chat/domain/chat.mjs',
    ]);
    assert.deepEqual(r.files, [
      'modules/auth/domain/session.mjs',
      'modules/ai-chat/domain/chat.mjs',
    ]);
  });

  it('--slice stored as string', () => {
    const r = parseArgs(['--slice=TPL-289']);
    assert.equal(r.slice, 'TPL-289');
  });

  it('--out stored as path', () => {
    const r = parseArgs(['--out=path/file.md']);
    assert.equal(r.out, 'path/file.md');
  });

  it('invalid profile throws', () => {
    assert.throws(() => parseArgs(['--profile=huge']), /invalid profile/i);
  });
});

describe('resolveBudget', () => {
  it('no override uses profile default', () => {
    assert.equal(resolveBudget('small', null), 12000);
    assert.equal(resolveBudget('mid', null), 16000);
    assert.equal(resolveBudget('frontier', null), 64000);
  });

  it('explicit budget overrides profile', () => {
    assert.equal(resolveBudget('small', 20000), 20000);
  });
});
