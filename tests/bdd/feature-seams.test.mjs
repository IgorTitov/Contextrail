/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of feature-seams-test in this repository.
 * @sidecar feature-seams.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for feature-seams.feature.
 * Proves user-visible feature seam behavior through the feature-seams module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SEAM_STATES,
  whenEnabled,
  whenShadow,
  assertSeamPort,
  createMemorySeamAdapter,
} from '../../modules/feature-seams/public-api.mjs';

const feature = readFileSync(new URL('./features/feature-seams.feature', import.meta.url), 'utf8');

describe('Feature: Feature seams (Branch by Abstraction)', () => {
  /** @type {ReturnType<typeof createMemorySeamAdapter>} */
  let adapter;

  beforeEach(() => {
    adapter = createMemorySeamAdapter();
    assertSeamPort(adapter);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Feature seams (Branch by Abstraction)'));
    assert.ok(feature.includes('Scenario: Disabled seam runs the old path'));
    assert.ok(feature.includes('Scenario: Active seam runs the new path'));
    assert.ok(feature.includes('Scenario: Enable a seam at runtime'));
    assert.ok(feature.includes('Scenario: Disable a seam at runtime'));
    assert.ok(feature.includes('Scenario: Unknown seam defaults to old path'));
    assert.ok(feature.includes('Scenario: List all registered seams'));
    assert.ok(feature.includes('Scenario: Shadow mode runs both paths and returns old result'));
    assert.ok(feature.includes('Scenario: Shadow mode detects divergence'));
    assert.ok(feature.includes('Scenario: Shadow mode handles new-path failure'));
  });

  test('Scenario: Disabled seam runs the old path', () => {
    // Given a seam "dark-mode" registered as disabled
    adapter.register('dark-mode', { state: SEAM_STATES.DISABLED, owner: 'test' });

    // When the system branches on "dark-mode"
    const result = whenEnabled(
      adapter,
      'dark-mode',
      () => 'new',
      () => 'old',
    );

    // Then the old path executes
    assert.equal(result, 'old');
  });

  test('Scenario: Active seam runs the new path', () => {
    // Given a seam "dark-mode" registered as active
    adapter.register('dark-mode', { state: SEAM_STATES.ACTIVE, owner: 'test' });

    // When the system branches on "dark-mode"
    const result = whenEnabled(
      adapter,
      'dark-mode',
      () => 'new',
      () => 'old',
    );

    // Then the new path executes
    assert.equal(result, 'new');
  });

  test('Scenario: Enable a seam at runtime', () => {
    // Given a seam "dark-mode" registered as disabled
    adapter.register('dark-mode', { state: SEAM_STATES.DISABLED, owner: 'test' });

    // When the operator enables "dark-mode"
    adapter.enable('dark-mode');

    // Then the seam "dark-mode" is active
    assert.equal(adapter.isEnabled('dark-mode'), true);
  });

  test('Scenario: Disable a seam at runtime', () => {
    // Given a seam "dark-mode" registered as active
    adapter.register('dark-mode', { state: SEAM_STATES.ACTIVE, owner: 'test' });

    // When the operator disables "dark-mode"
    adapter.disable('dark-mode');

    // Then the seam "dark-mode" is not active
    assert.equal(adapter.isEnabled('dark-mode'), false);
  });

  test('Scenario: Unknown seam defaults to old path', () => {
    // Given no seam is registered for "experimental-nav"
    // When the system branches on "experimental-nav"
    const result = whenEnabled(
      adapter,
      'experimental-nav',
      () => 'new',
      () => 'old',
    );

    // Then the old path executes
    assert.equal(result, 'old');
  });

  test('Scenario: List all registered seams', () => {
    // Given a seam "dark-mode" registered as active
    adapter.register('dark-mode', { state: SEAM_STATES.ACTIVE, owner: 'test' });

    // And a seam "new-sidebar" registered as disabled
    adapter.register('new-sidebar', { state: SEAM_STATES.DISABLED, owner: 'test' });

    // When the operator lists all seams
    const list = adapter.list();

    // Then the list contains "dark-mode" and "new-sidebar"
    const flags = list.map((s) => s.flag);
    assert.ok(flags.includes('dark-mode'));
    assert.ok(flags.includes('new-sidebar'));
  });

  test('Scenario: Shadow mode runs both paths and returns old result', () => {
    // Given a seam "new-hash" registered as shadow
    adapter.register('new-hash', { state: SEAM_STATES.SHADOW, owner: 'test' });

    // When the system shadow-branches on "new-hash"
    let oldRan = false;
    let newRan = false;
    const result = whenShadow(
      adapter,
      'new-hash',
      () => {
        newRan = true;
        return 'argon2';
      },
      () => {
        oldRan = true;
        return 'bcrypt';
      },
    );

    // Then both paths execute
    assert.ok(oldRan, 'old path must run');
    assert.ok(newRan, 'new path must run');

    // And the old path result is returned
    assert.equal(result, 'bcrypt');
  });

  test('Scenario: Shadow mode detects divergence', () => {
    // Given a seam "new-hash" registered as shadow
    adapter.register('new-hash', { state: SEAM_STATES.SHADOW, owner: 'test' });

    // When the system shadow-branches on "new-hash" with diverging results
    let diverged = false;
    whenShadow(
      adapter,
      'new-hash',
      () => 'argon2-hash',
      () => 'bcrypt-hash',
      {
        onDivergence: () => {
          diverged = true;
        },
      },
    );

    // Then the divergence callback fires
    assert.ok(diverged);
  });

  test('Scenario: Shadow mode handles new-path failure', () => {
    // Given a seam "new-hash" registered as shadow
    adapter.register('new-hash', { state: SEAM_STATES.SHADOW, owner: 'test' });

    // When the system shadow-branches on "new-hash" and the new path throws
    let errorCaught = false;
    const result = whenShadow(
      adapter,
      'new-hash',
      () => {
        throw new Error('argon2 not available');
      },
      () => 'bcrypt-hash',
      {
        onError: () => {
          errorCaught = true;
        },
      },
    );

    // Then the old path result is returned
    assert.equal(result, 'bcrypt-hash');

    // And the error callback fires
    assert.ok(errorCaught);
  });
});
