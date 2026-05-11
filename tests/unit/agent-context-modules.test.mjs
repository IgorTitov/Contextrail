/* @HEADER
 * @version 0.7.100 | 2026-05-05
 * @purpose Unit tests for agent-context.mjs Tier-2 module resolution helpers.
 * @sidecar agent-context-modules.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-290

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveModuleName, uniqueModulesFromFiles } from '../../scripts/agent-context.mjs';

describe('resolveModuleName', () => {
  it('nested path: modules/auth/domain/session.mjs → auth', () => {
    assert.equal(resolveModuleName('modules/auth/domain/session.mjs'), 'auth');
  });

  it('file directly under module root: modules/auth/public-api.mjs → auth', () => {
    assert.equal(resolveModuleName('modules/auth/public-api.mjs'), 'auth');
  });

  it('hyphenated module name: modules/auth-core/foo.mjs → auth-core', () => {
    assert.equal(resolveModuleName('modules/auth-core/foo.mjs'), 'auth-core');
  });

  it('apps/ path resolves to null', () => {
    assert.equal(resolveModuleName('apps/starter/index.mjs'), null);
  });

  it('scripts/ path resolves to null', () => {
    assert.equal(resolveModuleName('scripts/foo.mjs'), null);
  });

  it('Windows-style backslash path: modules\\auth\\foo.mjs → auth', () => {
    assert.equal(resolveModuleName('modules\\auth\\foo.mjs'), 'auth');
  });
});

describe('uniqueModulesFromFiles', () => {
  it('empty list returns empty list', () => {
    assert.deepEqual(uniqueModulesFromFiles([]), []);
  });

  it('deduplicates same module from multiple files', () => {
    const result = uniqueModulesFromFiles([
      'modules/auth/domain/session.mjs',
      'modules/auth/ports/auth-port.mjs',
    ]);
    assert.deepEqual(result, ['auth']);
  });

  it('returns two modules in first-seen order', () => {
    const result = uniqueModulesFromFiles([
      'modules/auth/domain/session.mjs',
      'modules/ai-chat/domain/message-history.mjs',
    ]);
    assert.deepEqual(result, ['auth', 'ai-chat']);
  });

  it('filters out non-module paths', () => {
    const result = uniqueModulesFromFiles([
      'apps/starter/index.mjs',
      'modules/auth/domain/session.mjs',
      'scripts/foo.mjs',
    ]);
    assert.deepEqual(result, ['auth']);
  });

  it('all non-module paths returns empty list', () => {
    const result = uniqueModulesFromFiles([
      'apps/starter/index.mjs',
      'scripts/foo.mjs',
    ]);
    assert.deepEqual(result, []);
  });

  it('preserves first-seen order when same module appears later', () => {
    const result = uniqueModulesFromFiles([
      'modules/ai-chat/domain/message-history.mjs',
      'modules/auth/domain/session.mjs',
      'modules/ai-chat/ports/ai-chat-port.mjs',
    ]);
    assert.deepEqual(result, ['ai-chat', 'auth']);
  });
});
