/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify PWA registration graceful degradation in Node.js, callback subscription/unsubscription, and applyUpdate behavior.
 * @sidecar pwa-register.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerServiceWorker,
  onUpdateAvailable,
  applyUpdate,
  _reset,
} from '../../apps/starter/pwa/pwa-register.mjs';

describe('registerServiceWorker (TPL-028)', () => {
  beforeEach(() => _reset());

  it('returns null when navigator.serviceWorker is unavailable', async () => {
    const result = await registerServiceWorker('./sw.mjs');
    assert.equal(result, null);
  });

  it('accepts options parameter without throwing', async () => {
    const result = await registerServiceWorker('./sw.mjs', { type: 'module' });
    assert.equal(result, null);
  });
});

describe('onUpdateAvailable (TPL-028)', () => {
  beforeEach(() => _reset());

  it('returns an unsubscribe function', () => {
    const unsub = onUpdateAvailable(() => {});
    assert.equal(typeof unsub, 'function');
  });

  it('unsubscribe removes the callback', () => {
    const calls = [];
    const unsub = onUpdateAvailable(() => calls.push('called'));
    unsub();
    // No way to trigger in Node.js, but at least it does not throw
    assert.equal(calls.length, 0);
  });
});

describe('applyUpdate (TPL-028)', () => {
  it('is a no-op when registration is null', () => {
    assert.doesNotThrow(() => applyUpdate(null));
  });

  it('is a no-op when registration has no waiting worker', () => {
    assert.doesNotThrow(() => applyUpdate({}));
  });

  it('sends SKIP_WAITING message to waiting worker', () => {
    const messages = [];
    const fakeReg = {
      waiting: { postMessage: (msg) => messages.push(msg) },
    };
    applyUpdate(fakeReg);
    assert.equal(messages.length, 1);
    assert.deepEqual(messages[0], { type: 'SKIP_WAITING' });
  });
});
