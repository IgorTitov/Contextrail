/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify install prompt initial state, unavailable outcome, state change subscription, and Node.js no-op behavior.
 * @sidecar install-prompt.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initInstallPrompt,
  isInstallAvailable,
  showInstallPrompt,
  onInstallStateChange,
  _reset,
} from '../../apps/starter/pwa/install-prompt.mjs';

describe('install-prompt (TPL-028)', () => {
  beforeEach(() => _reset());

  it('isInstallAvailable returns false initially', () => {
    assert.equal(isInstallAvailable(), false);
  });

  it('showInstallPrompt returns unavailable when no prompt captured', async () => {
    const result = await showInstallPrompt();
    assert.deepEqual(result, { outcome: 'unavailable' });
  });

  it('onInstallStateChange returns an unsubscribe function', () => {
    const unsub = onInstallStateChange(() => {});
    assert.equal(typeof unsub, 'function');
  });

  it('unsubscribe removes the callback', () => {
    const calls = [];
    const unsub = onInstallStateChange(() => calls.push('called'));
    unsub();
    assert.equal(calls.length, 0);
  });

  it('initInstallPrompt is a no-op in Node.js', () => {
    // Should not throw (no window object)
    assert.doesNotThrow(() => initInstallPrompt());
  });

  it('isInstallAvailable remains false after init in Node.js', () => {
    initInstallPrompt();
    assert.equal(isInstallAvailable(), false);
  });

  it('_reset clears state', () => {
    // After reset, should be in initial state
    _reset();
    assert.equal(isInstallAvailable(), false);
  });
});
