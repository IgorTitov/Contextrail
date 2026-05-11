/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify all public behaviors of the app-config module including mode constants, detection logic, setMode/getMode, feature-flag defaults per mode, manual overrides, resolveConfig, and resetConfig.
 * @sidecar app-config.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for apps/starter/app-config.mjs
 * Tests mode detection, feature flags, manual overrides, and defaults.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  MODES,
  detectMode,
  getMode,
  setMode,
  resetConfig,
  getFeatureFlags,
  setFeatureFlag,
  resolveConfig,
} from '../../apps/starter/app-config.mjs';

describe('app-config', () => {
  beforeEach(() => {
    resetConfig();
  });

  describe('MODES', () => {
    it('exports all supported mode constants', () => {
      assert.equal(MODES.HOSTED, 'hosted');
      assert.equal(MODES.PWA, 'pwa');
      assert.equal(MODES.LOCAL, 'local');
      assert.equal(MODES.ELECTRON, 'electron');
      assert.equal(MODES.EXTENSION, 'extension');
    });

    it('has exactly 5 modes', () => {
      assert.equal(Object.keys(MODES).length, 5);
    });
  });

  describe('detectMode()', () => {
    it('returns hosted when no environment signals are present', () => {
      // In Node.js test env, there is no window/protocol — should default to hosted
      assert.equal(detectMode(), MODES.HOSTED);
    });

    it('returns local when hints include file protocol', () => {
      assert.equal(detectMode({ protocol: 'file:' }), MODES.LOCAL);
    });

    it('returns electron when hints include electronAPI', () => {
      assert.equal(detectMode({ hasElectronAPI: true }), MODES.ELECTRON);
    });

    it('returns extension when hints include chrome runtime', () => {
      assert.equal(detectMode({ hasChromeRuntime: true }), MODES.EXTENSION);
    });

    it('returns pwa when hints include pwa meta', () => {
      assert.equal(detectMode({ pwaMeta: true }), MODES.PWA);
    });

    it('prefers electron over file protocol', () => {
      assert.equal(detectMode({ protocol: 'file:', hasElectronAPI: true }), MODES.ELECTRON);
    });

    it('prefers extension over file protocol', () => {
      assert.equal(detectMode({ protocol: 'file:', hasChromeRuntime: true }), MODES.EXTENSION);
    });
  });

  describe('setMode() / getMode()', () => {
    it('defaults to hosted', () => {
      assert.equal(getMode(), MODES.HOSTED);
    });

    it('allows setting a valid mode', () => {
      setMode(MODES.PWA);
      assert.equal(getMode(), MODES.PWA);
    });

    it('throws on invalid mode', () => {
      assert.throws(() => setMode('invalid'), /Unknown mode/);
    });
  });

  describe('getFeatureFlags()', () => {
    it('returns default flags for hosted mode', () => {
      const flags = getFeatureFlags();
      assert.equal(flags.pwa, false);
      assert.equal(flags.offlineCache, false);
      assert.equal(flags.installPrompt, false);
    });

    it('enables PWA flags when mode is pwa', () => {
      setMode(MODES.PWA);
      const flags = getFeatureFlags();
      assert.equal(flags.pwa, true);
      assert.equal(flags.offlineCache, true);
      assert.equal(flags.installPrompt, true);
    });

    it('enables offlineCache in local mode', () => {
      setMode(MODES.LOCAL);
      const flags = getFeatureFlags();
      assert.equal(flags.pwa, false);
      assert.equal(flags.offlineCache, true);
      assert.equal(flags.installPrompt, false);
    });

    it('uses hosted defaults for electron mode', () => {
      setMode(MODES.ELECTRON);
      const flags = getFeatureFlags();
      assert.equal(flags.pwa, false);
      assert.equal(flags.offlineCache, false);
      assert.equal(flags.installPrompt, false);
    });

    it('uses hosted defaults for extension mode', () => {
      setMode(MODES.EXTENSION);
      const flags = getFeatureFlags();
      assert.equal(flags.pwa, false);
      assert.equal(flags.offlineCache, false);
      assert.equal(flags.installPrompt, false);
    });
  });

  describe('setFeatureFlag()', () => {
    it('overrides a single flag', () => {
      setFeatureFlag('pwa', true);
      const flags = getFeatureFlags();
      assert.equal(flags.pwa, true);
      assert.equal(flags.offlineCache, false); // other flags untouched
    });

    it('throws on unknown flag name', () => {
      assert.throws(() => setFeatureFlag('unknown', true), /Unknown feature flag/);
    });
  });

  describe('resolveConfig()', () => {
    it('returns mode and flags together', () => {
      setMode(MODES.PWA);
      const config = resolveConfig();
      assert.equal(config.mode, MODES.PWA);
      assert.equal(config.flags.pwa, true);
      assert.equal(config.flags.offlineCache, true);
    });

    it('includes manual flag overrides', () => {
      setMode(MODES.HOSTED);
      setFeatureFlag('offlineCache', true);
      const config = resolveConfig();
      assert.equal(config.mode, MODES.HOSTED);
      assert.equal(config.flags.offlineCache, true);
      assert.equal(config.flags.pwa, false);
    });
  });

  describe('resetConfig()', () => {
    it('resets mode to hosted and clears flag overrides', () => {
      setMode(MODES.PWA);
      setFeatureFlag('installPrompt', false);
      resetConfig();
      assert.equal(getMode(), MODES.HOSTED);
      const flags = getFeatureFlags();
      assert.equal(flags.pwa, false);
      assert.equal(flags.installPrompt, false);
    });
  });
});
