/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify environment detection returns correct capabilities for explicit hints, Node.js auto-detection, and simulated platform scenarios.
 * @sidecar environment-detect.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for platform environment detection.
 *
 * SpecRefs: TPL-030
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { detectEnvironment } from '../../apps/starter/platform/environment-detect.mjs';

describe('environment-detect', () => {
  describe('with explicit hints', () => {
    it('returns all false when hints are empty', () => {
      const caps = detectEnvironment({});
      assert.equal(caps.hasServiceWorker, false);
      assert.equal(caps.hasIndexedDB, false);
      assert.equal(caps.hasNotification, false);
      assert.equal(caps.hasLocalStorage, false);
      assert.equal(caps.isFileProtocol, false);
      assert.equal(caps.hasElectronAPI, false);
      assert.equal(caps.hasCapacitor, false);
      assert.equal(caps.hasChromeExtensionAPI, false);
      assert.equal(caps.isStandalone, false);
    });

    it('returns all true when hints are all true', () => {
      const caps = detectEnvironment({
        hasServiceWorker: true,
        hasIndexedDB: true,
        hasNotification: true,
        hasLocalStorage: true,
        isFileProtocol: true,
        hasElectronAPI: true,
        hasCapacitor: true,
        hasChromeExtensionAPI: true,
        isStandalone: true,
      });
      assert.equal(caps.hasServiceWorker, true);
      assert.equal(caps.hasIndexedDB, true);
      assert.equal(caps.hasNotification, true);
      assert.equal(caps.hasLocalStorage, true);
      assert.equal(caps.isFileProtocol, true);
      assert.equal(caps.hasElectronAPI, true);
      assert.equal(caps.hasCapacitor, true);
      assert.equal(caps.hasChromeExtensionAPI, true);
      assert.equal(caps.isStandalone, true);
    });

    it('coerces truthy/falsy values to booleans', () => {
      const caps = detectEnvironment({
        hasServiceWorker: 1,
        hasIndexedDB: '',
        hasNotification: 'yes',
        hasLocalStorage: 0,
      });
      assert.equal(caps.hasServiceWorker, true);
      assert.equal(caps.hasIndexedDB, false);
      assert.equal(caps.hasNotification, true);
      assert.equal(caps.hasLocalStorage, false);
    });

    it('returns a frozen object', () => {
      const caps = detectEnvironment({});
      assert.ok(Object.isFrozen(caps));
    });

    it('partial hints default missing fields to false', () => {
      const caps = detectEnvironment({ hasIndexedDB: true });
      assert.equal(caps.hasIndexedDB, true);
      assert.equal(caps.hasServiceWorker, false);
      assert.equal(caps.hasLocalStorage, false);
    });
  });

  describe('auto-detection (Node.js environment)', () => {
    it('returns a capabilities object with all expected keys', () => {
      const caps = detectEnvironment();
      const expectedKeys = [
        'hasServiceWorker',
        'hasIndexedDB',
        'hasNotification',
        'hasLocalStorage',
        'isFileProtocol',
        'hasElectronAPI',
        'hasCapacitor',
        'hasChromeExtensionAPI',
        'isStandalone',
      ];
      for (const key of expectedKeys) {
        assert.ok(key in caps, `Missing key: ${key}`);
        assert.equal(typeof caps[key], 'boolean', `${key} should be boolean`);
      }
    });

    it('returns false for browser APIs in Node.js', () => {
      const caps = detectEnvironment();
      assert.equal(caps.hasServiceWorker, false);
      assert.equal(caps.isFileProtocol, false);
      assert.equal(caps.hasElectronAPI, false);
      assert.equal(caps.hasCapacitor, false);
      assert.equal(caps.hasChromeExtensionAPI, false);
      assert.equal(caps.isStandalone, false);
    });

    it('returns a frozen object', () => {
      const caps = detectEnvironment();
      assert.ok(Object.isFrozen(caps));
    });
  });

  describe('simulated platform scenarios', () => {
    it('simulates an Electron environment', () => {
      const caps = detectEnvironment({
        hasElectronAPI: true,
        hasIndexedDB: true,
        hasLocalStorage: true,
        hasNotification: true,
      });
      assert.equal(caps.hasElectronAPI, true);
      assert.equal(caps.isFileProtocol, false);
      assert.equal(caps.hasChromeExtensionAPI, false);
    });

    it('simulates a file:// environment', () => {
      const caps = detectEnvironment({
        isFileProtocol: true,
        hasLocalStorage: false,
        hasIndexedDB: true,
      });
      assert.equal(caps.isFileProtocol, true);
      assert.equal(caps.hasLocalStorage, false);
      assert.equal(caps.hasIndexedDB, true);
    });

    it('simulates a Chrome extension environment', () => {
      const caps = detectEnvironment({
        hasChromeExtensionAPI: true,
        hasLocalStorage: true,
        hasIndexedDB: true,
      });
      assert.equal(caps.hasChromeExtensionAPI, true);
      assert.equal(caps.hasElectronAPI, false);
    });

    it('simulates a Capacitor environment', () => {
      const caps = detectEnvironment({
        hasCapacitor: true,
        hasIndexedDB: true,
        hasLocalStorage: true,
        hasServiceWorker: true,
      });
      assert.equal(caps.hasCapacitor, true);
      assert.equal(caps.hasServiceWorker, true);
    });
  });
});
