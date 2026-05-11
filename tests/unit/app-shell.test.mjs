/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify that the app shell correctly reports adapter plans for all modes and assembles a well-formed app context without requiring a real DOM.
 * @sidecar app-shell.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for apps/starter/app.mjs (app shell).
 * Tests adapter wiring, initialization order, and mode-based behavior.
 *
 * Note: app.mjs is a thin orchestration layer. These tests verify the
 * wiring logic and exported API shape without requiring a real DOM.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { resetConfig, setMode, MODES } from '../../apps/starter/app-config.mjs';
import { createAppContext, getAdapterPlan } from '../../apps/starter/app.mjs';

describe('app-shell', () => {
  beforeEach(() => {
    resetConfig();
  });

  // Environment hints for testing — simulate browser with localStorage + IndexedDB
  const BROWSER_HINTS = {
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

  const NO_STORAGE_HINTS = {
    ...BROWSER_HINTS,
    hasLocalStorage: false,
    hasIndexedDB: false,
  };

  describe('getAdapterPlan()', () => {
    it('returns localStorage adapter plan for hosted mode', () => {
      setMode(MODES.HOSTED);
      const plan = getAdapterPlan(BROWSER_HINTS);
      assert.equal(plan.storage, 'localStorage');
      assert.equal(plan.notifications, 'dom');
    });

    it('returns localStorage adapter plan for pwa mode', () => {
      setMode(MODES.PWA);
      const plan = getAdapterPlan(BROWSER_HINTS);
      assert.equal(plan.storage, 'localStorage');
      assert.equal(plan.notifications, 'dom');
    });

    it('returns indexedDB adapter plan for local mode with IndexedDB', () => {
      setMode(MODES.LOCAL);
      const plan = getAdapterPlan(BROWSER_HINTS);
      assert.equal(plan.storage, 'indexedDB');
      assert.equal(plan.notifications, 'dom');
    });

    it('returns indexedDB adapter plan for electron mode with IndexedDB', () => {
      setMode(MODES.ELECTRON);
      const plan = getAdapterPlan(BROWSER_HINTS);
      assert.equal(plan.storage, 'indexedDB');
    });

    it('returns localStorage adapter plan for extension mode', () => {
      setMode(MODES.EXTENSION);
      const plan = getAdapterPlan(BROWSER_HINTS);
      assert.equal(plan.storage, 'localStorage');
    });

    it('returns memory adapter when no storage is available', () => {
      setMode(MODES.HOSTED);
      const plan = getAdapterPlan(NO_STORAGE_HINTS);
      assert.equal(plan.storage, 'memory');
    });

    it('includes all expected keys', () => {
      const plan = getAdapterPlan(BROWSER_HINTS);
      assert.ok('storage' in plan);
      assert.ok('notifications' in plan);
    });
  });

  describe('createAppContext()', () => {
    it('returns a context object with mode, flags, and adapter plan', () => {
      setMode(MODES.HOSTED);
      const ctx = createAppContext();
      assert.equal(ctx.mode, MODES.HOSTED);
      assert.ok(ctx.flags);
      assert.ok(ctx.adapterPlan);
      // In Node.js, no localStorage available — resolves to memory
      assert.ok(['localStorage', 'memory'].includes(ctx.adapterPlan.storage));
    });

    it('reflects mode changes', () => {
      setMode(MODES.PWA);
      const ctx = createAppContext();
      assert.equal(ctx.mode, MODES.PWA);
      assert.equal(ctx.flags.pwa, true);
    });
  });
});
