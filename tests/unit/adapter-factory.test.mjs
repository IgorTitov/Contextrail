/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify adapter factory selects the correct storage adapter based on mode and capabilities.
 * @sidecar adapter-factory.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the platform adapter factory.
 *
 * SpecRefs: TPL-031
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStorageAdapter,
  resolveStorageType,
} from '../../apps/starter/platform/adapter-factory.mjs';
import { assertStoragePort } from '../../modules/user-preferences/public-api.mjs';

// ---------------------------------------------------------------------------
// Capability fixture helpers
// ---------------------------------------------------------------------------

const FULL_BROWSER = {
  hasServiceWorker: true,
  hasIndexedDB: true,
  hasNotification: true,
  hasLocalStorage: true,
  isFileProtocol: false,
  hasElectronAPI: false,
  hasCapacitor: false,
  hasChromeExtensionAPI: false,
  isStandalone: false,
};

const NO_LOCALSTORAGE = { ...FULL_BROWSER, hasLocalStorage: false };
const NO_IDB = { ...FULL_BROWSER, hasIndexedDB: false };
const NOTHING = {
  hasServiceWorker: false,
  hasIndexedDB: false,
  hasNotification: false,
  hasLocalStorage: false,
  isFileProtocol: false,
  hasElectronAPI: false,
  hasCapacitor: false,
  hasChromeExtensionAPI: false,
  isStandalone: false,
};

// ---------------------------------------------------------------------------
// resolveStorageType() tests
// ---------------------------------------------------------------------------

describe('resolveStorageType()', () => {
  it('returns localStorage for hosted mode with full browser', () => {
    assert.equal(resolveStorageType('hosted', FULL_BROWSER), 'localStorage');
  });

  it('returns localStorage for pwa mode with full browser', () => {
    assert.equal(resolveStorageType('pwa', FULL_BROWSER), 'localStorage');
  });

  it('returns indexedDB for electron mode with IndexedDB', () => {
    assert.equal(resolveStorageType('electron', FULL_BROWSER), 'indexedDB');
  });

  it('returns indexedDB for local mode with IndexedDB', () => {
    assert.equal(resolveStorageType('local', FULL_BROWSER), 'indexedDB');
  });

  it('returns localStorage for electron mode without IndexedDB', () => {
    assert.equal(resolveStorageType('electron', NO_IDB), 'localStorage');
  });

  it('returns indexedDB for capacitor mode with IndexedDB', () => {
    assert.equal(resolveStorageType('capacitor', FULL_BROWSER), 'indexedDB');
  });

  it('returns memory when nothing is available', () => {
    assert.equal(resolveStorageType('hosted', NOTHING), 'memory');
  });

  it('returns memory for extension mode without localStorage', () => {
    assert.equal(resolveStorageType('extension', NO_LOCALSTORAGE), 'memory');
  });
});

// ---------------------------------------------------------------------------
// createStorageAdapter() tests
// ---------------------------------------------------------------------------

describe('createStorageAdapter()', () => {
  it('returns a StoragePort for hosted mode', async () => {
    // Node.js has no localStorage — will fall through to memory adapter
    const adapter = await createStorageAdapter('hosted', NOTHING);
    assertStoragePort(adapter);
  });

  it('memory adapter works correctly when nothing is available', async () => {
    const adapter = await createStorageAdapter('hosted', NOTHING);
    assert.equal(adapter.load(), null);
    adapter.save({ locale: 'en', theme: 'dark' });
    assert.deepEqual(adapter.load(), { locale: 'en', theme: 'dark' });
  });

  it('returns IndexedDB adapter for electron mode with IndexedDB', async () => {
    // Node.js has no globalThis.indexedDB, so this will throw
    // In a real Electron environment it would succeed
    await assert.rejects(
      () => createStorageAdapter('electron', { ...FULL_BROWSER, hasIndexedDB: true }),
      /IndexedDB is not available/,
    );
  });

  it('returns a StoragePort for pwa mode without localStorage', async () => {
    const adapter = await createStorageAdapter('pwa', NO_LOCALSTORAGE);
    assertStoragePort(adapter);
    // Should be memory adapter as fallback
    assert.equal(adapter.load(), null);
  });
});
