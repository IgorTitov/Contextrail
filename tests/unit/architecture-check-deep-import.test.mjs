/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for deep-import detection regex in architecture-check.mjs
 * @sidecar architecture-check-deep-import.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

// The deep-import regex extracted from architecture-check.mjs (both line 135 and 202).
const DEEP_IMPORT_RE =
  /modules\/[^/]+\/(?:src\/(?!public-api\.[cm]?[jt]sx?)|(?:domain|application|ports|adapters|di)\/)/;

describe('deep-import regex', () => {
  // ── BLOCKED: /src/ layout ──
  test('blocks modules/auth/src/domain/foo.mjs (src layout)', () => {
    assert.ok(DEEP_IMPORT_RE.test('modules/auth/src/domain/foo.mjs'));
  });

  test('blocks modules/auth/src/adapters/http.mjs (src layout)', () => {
    assert.ok(DEEP_IMPORT_RE.test('modules/auth/src/adapters/http.mjs'));
  });

  // ── BLOCKED: flat layout ──
  test('blocks modules/auth/domain/auth-state.mjs (flat layout)', () => {
    assert.ok(DEEP_IMPORT_RE.test('modules/auth/domain/auth-state.mjs'));
  });

  test('blocks modules/auth/ports/auth-port.mjs (flat layout)', () => {
    assert.ok(DEEP_IMPORT_RE.test('modules/auth/ports/auth-port.mjs'));
  });

  test('blocks modules/auth/adapters/http.mjs (flat layout)', () => {
    assert.ok(DEEP_IMPORT_RE.test('modules/auth/adapters/http.mjs'));
  });

  test('blocks modules/auth/di/container.mjs (flat layout)', () => {
    assert.ok(DEEP_IMPORT_RE.test('modules/auth/di/container.mjs'));
  });

  test('blocks modules/auth/application/use-case.mjs (flat layout)', () => {
    assert.ok(DEEP_IMPORT_RE.test('modules/auth/application/use-case.mjs'));
  });

  // ── ALLOWED: public-api imports ──
  test('allows modules/auth/public-api.mjs', () => {
    assert.ok(!DEEP_IMPORT_RE.test('modules/auth/public-api.mjs'));
  });

  test('allows modules/auth/src/public-api.ts', () => {
    assert.ok(!DEEP_IMPORT_RE.test('modules/auth/src/public-api.ts'));
  });

  test('allows modules/auth/src/public-api.mjs', () => {
    assert.ok(!DEEP_IMPORT_RE.test('modules/auth/src/public-api.mjs'));
  });

  test('allows modules/auth/src/public-api.cjs', () => {
    assert.ok(!DEEP_IMPORT_RE.test('modules/auth/src/public-api.cjs'));
  });

  test('allows modules/auth/src/public-api.js', () => {
    assert.ok(!DEEP_IMPORT_RE.test('modules/auth/src/public-api.js'));
  });

  // ── ALLOWED: non-module paths ──
  test('allows apps/starter/main.mjs', () => {
    assert.ok(!DEEP_IMPORT_RE.test('apps/starter/main.mjs'));
  });

  test('allows modules/auth/manifest.json (not a layer dir)', () => {
    assert.ok(!DEEP_IMPORT_RE.test('modules/auth/manifest.json'));
  });
});
