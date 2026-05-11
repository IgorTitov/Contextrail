/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of permission-test in this repository.
 * @sidecar permission.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for permission.feature.
 * Proves user-visible permission behavior through the permission module public API.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertPermissionPort,
  createStaticRulesAdapter,
} from '../../modules/permission/public-api.mjs';

const feature = readFileSync(new URL('./features/permission.feature', import.meta.url), 'utf8');

/** Standard 3-tier role hierarchy for tests. */
const HIERARCHY = { admin: ['editor'], editor: ['viewer'] };

describe('Feature: Role-based permissions', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Role-based permissions'));
    assert.ok(feature.includes('Scenario: Admin can perform an allowed action'));
    assert.ok(feature.includes('Scenario: Viewer cannot perform an admin-only action'));
    assert.ok(feature.includes('Scenario: Editor inherits viewer permissions'));
    assert.ok(feature.includes('Scenario: Default effect denies when no rule matches'));
    assert.ok(feature.includes('Scenario: Grant a new permission at runtime'));
    assert.ok(feature.includes('Scenario: Revoke a permission'));
  });

  test('Scenario: Admin can perform an allowed action', () => {
    // Given a permission adapter with role hierarchy admin > editor > viewer
    // And the rule allows admin to "delete" resource "article"
    const adapter = createStaticRulesAdapter({
      roles: HIERARCHY,
      rules: [{ role: 'admin', action: 'delete', resource: 'article', effect: 'allow' }],
    });
    assertPermissionPort(adapter);

    // And the current user has role "admin"
    adapter.setUser({ role: 'admin' });

    // Then the user can "delete" resource "article"
    assert.equal(adapter.can('delete', 'article'), true);
  });

  test('Scenario: Viewer cannot perform an admin-only action', () => {
    // Given a permission adapter with role hierarchy admin > editor > viewer
    // And the rule allows admin to "delete" resource "article"
    const adapter = createStaticRulesAdapter({
      roles: HIERARCHY,
      rules: [{ role: 'admin', action: 'delete', resource: 'article', effect: 'allow' }],
    });

    // And the current user has role "viewer"
    adapter.setUser({ role: 'viewer' });

    // Then the user cannot "delete" resource "article"
    assert.equal(adapter.cannot('delete', 'article'), true);
  });

  test('Scenario: Editor inherits viewer permissions', () => {
    // Given a permission adapter with role hierarchy admin > editor > viewer
    // And the rule allows viewer to "read" resource "article"
    const adapter = createStaticRulesAdapter({
      roles: HIERARCHY,
      rules: [{ role: 'viewer', action: 'read', resource: 'article', effect: 'allow' }],
    });

    // And the current user has role "editor"
    adapter.setUser({ role: 'editor' });

    // Then the user can "read" resource "article"
    assert.equal(adapter.can('read', 'article'), true);
  });

  test('Scenario: Default effect denies when no rule matches', () => {
    // Given a permission adapter with default deny
    const adapter = createStaticRulesAdapter({
      roles: HIERARCHY,
      rules: [],
      defaultEffect: 'deny',
    });

    // And the current user has role "viewer"
    adapter.setUser({ role: 'viewer' });

    // Then the user cannot "write" resource "secret"
    assert.equal(adapter.cannot('write', 'secret'), true);
  });

  test('Scenario: Grant a new permission at runtime', () => {
    // Given a permission adapter with default deny
    const adapter = createStaticRulesAdapter({
      roles: HIERARCHY,
      rules: [],
      defaultEffect: 'deny',
    });

    // And the current user has role "editor"
    adapter.setUser({ role: 'editor' });

    // When the system grants editor to "publish" resource "article"
    adapter.grant({ role: 'editor', action: 'publish', resource: 'article', effect: 'allow' });

    // Then the user can "publish" resource "article"
    assert.equal(adapter.can('publish', 'article'), true);
  });

  test('Scenario: Revoke a permission', () => {
    // Given a permission adapter with default deny
    // And the rule allows editor to "publish" resource "article"
    const adapter = createStaticRulesAdapter({
      roles: HIERARCHY,
      rules: [{ role: 'editor', action: 'publish', resource: 'article', effect: 'allow' }],
      defaultEffect: 'deny',
    });

    // And the current user has role "editor"
    adapter.setUser({ role: 'editor' });
    assert.equal(adapter.can('publish', 'article'), true);

    // When the system revokes "publish" on resource "article" for editor
    adapter.revoke('publish', 'article', 'editor');

    // Then the user cannot "publish" resource "article"
    assert.equal(adapter.cannot('publish', 'article'), true);
  });
});
