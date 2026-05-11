/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of permission-test in this repository.
 * @sidecar permission.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPermissionPort,
  createRoleHierarchy,
  matchRule,
  createStaticRulesAdapter,
  createDynamicPermissionAdapter,
} from '../../modules/permission/public-api.mjs';

// ---------------------------------------------------------------------------
// assertPermissionPort
// ---------------------------------------------------------------------------

describe('permission port — assertPermissionPort()', () => {
  test('accepts a valid adapter with all 6 methods', () => {
    const adapter = {
      can: () => true,
      cannot: () => false,
      grant: () => {},
      revoke: () => {},
      getRulesForRole: () => [],
      setUser: () => {},
    };
    assert.doesNotThrow(() => assertPermissionPort(adapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertPermissionPort(null), TypeError);
  });

  test('throws for undefined', () => {
    assert.throws(() => assertPermissionPort(undefined), TypeError);
  });

  test('throws for a primitive', () => {
    assert.throws(() => assertPermissionPort('not an adapter'), TypeError);
  });

  test('throws for missing can()', () => {
    assert.throws(
      () =>
        assertPermissionPort({
          cannot: () => false,
          grant: () => {},
          revoke: () => {},
          getRulesForRole: () => [],
          setUser: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing cannot()', () => {
    assert.throws(
      () =>
        assertPermissionPort({
          can: () => true,
          grant: () => {},
          revoke: () => {},
          getRulesForRole: () => [],
          setUser: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing grant()', () => {
    assert.throws(
      () =>
        assertPermissionPort({
          can: () => true,
          cannot: () => false,
          revoke: () => {},
          getRulesForRole: () => [],
          setUser: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing revoke()', () => {
    assert.throws(
      () =>
        assertPermissionPort({
          can: () => true,
          cannot: () => false,
          grant: () => {},
          getRulesForRole: () => [],
          setUser: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing getRulesForRole()', () => {
    assert.throws(
      () =>
        assertPermissionPort({
          can: () => true,
          cannot: () => false,
          grant: () => {},
          revoke: () => {},
          setUser: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing setUser()', () => {
    assert.throws(
      () =>
        assertPermissionPort({
          can: () => true,
          cannot: () => false,
          grant: () => {},
          revoke: () => {},
          getRulesForRole: () => [],
        }),
      TypeError,
    );
  });
});

// ---------------------------------------------------------------------------
// createRoleHierarchy
// ---------------------------------------------------------------------------

describe('permission domain — createRoleHierarchy()', () => {
  test('resolves a single role with no parents', () => {
    const h = createRoleHierarchy({});
    assert.deepEqual(h.resolveRoles('viewer'), ['viewer']);
  });

  test('resolves a simple one-level hierarchy', () => {
    const h = createRoleHierarchy({ admin: ['editor'] });
    const roles = h.resolveRoles('admin');
    assert.ok(roles.includes('admin'));
    assert.ok(roles.includes('editor'));
    assert.equal(roles.length, 2);
  });

  test('resolves a deep multi-level hierarchy', () => {
    const h = createRoleHierarchy({
      admin: ['editor'],
      editor: ['viewer'],
    });
    const roles = h.resolveRoles('admin');
    assert.ok(roles.includes('admin'));
    assert.ok(roles.includes('editor'));
    assert.ok(roles.includes('viewer'));
    assert.equal(roles.length, 3);
  });

  test('handles circular inheritance gracefully', () => {
    const h = createRoleHierarchy({
      a: ['b'],
      b: ['c'],
      c: ['a'],
    });
    const roles = h.resolveRoles('a');
    assert.ok(roles.includes('a'));
    assert.ok(roles.includes('b'));
    assert.ok(roles.includes('c'));
    assert.equal(roles.length, 3);
  });

  test('handles diamond inheritance', () => {
    const h = createRoleHierarchy({
      admin: ['editor', 'moderator'],
      editor: ['viewer'],
      moderator: ['viewer'],
    });
    const roles = h.resolveRoles('admin');
    assert.ok(roles.includes('admin'));
    assert.ok(roles.includes('editor'));
    assert.ok(roles.includes('moderator'));
    assert.ok(roles.includes('viewer'));
    assert.equal(roles.length, 4);
  });
});

// ---------------------------------------------------------------------------
// matchRule
// ---------------------------------------------------------------------------

describe('permission domain — matchRule()', () => {
  test('matches exact action and resource', () => {
    const rule = { role: 'editor', action: 'write', resource: 'article', effect: 'allow' };
    assert.equal(matchRule(rule, 'write', 'article'), true);
  });

  test('does not match different action', () => {
    const rule = { role: 'editor', action: 'write', resource: 'article', effect: 'allow' };
    assert.equal(matchRule(rule, 'read', 'article'), false);
  });

  test('does not match different resource', () => {
    const rule = { role: 'editor', action: 'write', resource: 'article', effect: 'allow' };
    assert.equal(matchRule(rule, 'write', 'comment'), false);
  });

  test('wildcard action matches any action', () => {
    const rule = { role: 'admin', action: '*', resource: 'article', effect: 'allow' };
    assert.equal(matchRule(rule, 'delete', 'article'), true);
    assert.equal(matchRule(rule, 'read', 'article'), true);
  });

  test('wildcard resource matches any resource', () => {
    const rule = { role: 'admin', action: 'read', resource: '*', effect: 'allow' };
    assert.equal(matchRule(rule, 'read', 'anything'), true);
  });

  test('double wildcard matches everything', () => {
    const rule = { role: 'admin', action: '*', resource: '*', effect: 'allow' };
    assert.equal(matchRule(rule, 'delete', 'system'), true);
  });

  test('condition matching succeeds when all rule conditions are met', () => {
    const rule = {
      role: 'editor',
      action: 'write',
      resource: 'article',
      effect: 'allow',
      conditions: { status: 'draft' },
    };
    assert.equal(matchRule(rule, 'write', 'article', { status: 'draft' }), true);
  });

  test('condition matching fails when a rule condition is not met', () => {
    const rule = {
      role: 'editor',
      action: 'write',
      resource: 'article',
      effect: 'allow',
      conditions: { status: 'draft' },
    };
    assert.equal(matchRule(rule, 'write', 'article', { status: 'published' }), false);
  });

  test('condition matching fails when conditions are not provided', () => {
    const rule = {
      role: 'editor',
      action: 'write',
      resource: 'article',
      effect: 'allow',
      conditions: { status: 'draft' },
    };
    assert.equal(matchRule(rule, 'write', 'article'), false);
  });

  test('rule without conditions matches regardless of provided conditions', () => {
    const rule = { role: 'editor', action: 'write', resource: 'article', effect: 'allow' };
    assert.equal(matchRule(rule, 'write', 'article', { status: 'draft' }), true);
  });
});

// ---------------------------------------------------------------------------
// createStaticRulesAdapter
// ---------------------------------------------------------------------------

describe('permission adapter — createStaticRulesAdapter()', () => {
  test('passes assertPermissionPort', () => {
    const adapter = createStaticRulesAdapter({ rules: [] });
    assert.doesNotThrow(() => assertPermissionPort(adapter));
  });

  test('basic can/cannot with a simple allow rule', () => {
    const adapter = createStaticRulesAdapter({
      rules: [{ role: 'viewer', action: 'read', resource: 'article', effect: 'allow' }],
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'article'), true);
    assert.equal(adapter.cannot('read', 'article'), false);
  });

  test('returns deny by default when no rules match', () => {
    const adapter = createStaticRulesAdapter({
      rules: [{ role: 'viewer', action: 'read', resource: 'article', effect: 'allow' }],
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('write', 'article'), false);
    assert.equal(adapter.cannot('write', 'article'), true);
  });

  test('respects defaultEffect: allow', () => {
    const adapter = createStaticRulesAdapter({
      rules: [],
      defaultEffect: 'allow',
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('anything', 'anything'), true);
  });

  test('wildcard rules match any action/resource', () => {
    const adapter = createStaticRulesAdapter({
      rules: [{ role: 'admin', action: '*', resource: '*', effect: 'allow' }],
    });
    adapter.setUser({ role: 'admin' });
    assert.equal(adapter.can('delete', 'system'), true);
    assert.equal(adapter.can('read', 'article'), true);
  });

  test('role hierarchy resolves inherited permissions', () => {
    const adapter = createStaticRulesAdapter({
      roles: { admin: ['editor'], editor: ['viewer'] },
      rules: [
        { role: 'viewer', action: 'read', resource: 'article', effect: 'allow' },
        { role: 'editor', action: 'write', resource: 'article', effect: 'allow' },
      ],
    });
    adapter.setUser({ role: 'admin' });
    assert.equal(adapter.can('read', 'article'), true, 'admin inherits viewer read');
    assert.equal(adapter.can('write', 'article'), true, 'admin inherits editor write');
  });

  test('grant() adds a new rule', () => {
    const adapter = createStaticRulesAdapter({ rules: [] });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'article'), false);

    adapter.grant({ role: 'viewer', action: 'read', resource: 'article', effect: 'allow' });
    assert.equal(adapter.can('read', 'article'), true);
  });

  test('revoke() removes matching rules', () => {
    const adapter = createStaticRulesAdapter({
      rules: [{ role: 'viewer', action: 'read', resource: 'article', effect: 'allow' }],
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'article'), true);

    adapter.revoke('read', 'article', 'viewer');
    assert.equal(adapter.can('read', 'article'), false);
  });

  test('revoke() without role removes all matching action/resource rules', () => {
    const adapter = createStaticRulesAdapter({
      rules: [
        { role: 'viewer', action: 'read', resource: 'article', effect: 'allow' },
        { role: 'editor', action: 'read', resource: 'article', effect: 'allow' },
      ],
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'article'), true);

    adapter.revoke('read', 'article');
    assert.equal(adapter.can('read', 'article'), false);
  });

  test('setUser() changes the current user context', () => {
    const adapter = createStaticRulesAdapter({
      rules: [
        { role: 'viewer', action: 'read', resource: 'article', effect: 'allow' },
        { role: 'editor', action: 'write', resource: 'article', effect: 'allow' },
      ],
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'article'), true);
    assert.equal(adapter.can('write', 'article'), false);

    adapter.setUser({ role: 'editor' });
    assert.equal(adapter.can('write', 'article'), true);
  });

  test('getRulesForRole() returns rules for effective roles', () => {
    const adapter = createStaticRulesAdapter({
      roles: { editor: ['viewer'] },
      rules: [
        { role: 'viewer', action: 'read', resource: 'article', effect: 'allow' },
        { role: 'editor', action: 'write', resource: 'article', effect: 'allow' },
        { role: 'admin', action: '*', resource: '*', effect: 'allow' },
      ],
    });
    const editorRules = adapter.getRulesForRole('editor');
    assert.equal(editorRules.length, 2);
    assert.ok(editorRules.some((r) => r.role === 'viewer'));
    assert.ok(editorRules.some((r) => r.role === 'editor'));
  });

  test('first matching rule wins (deny before allow)', () => {
    const adapter = createStaticRulesAdapter({
      rules: [
        { role: 'viewer', action: 'read', resource: 'secret', effect: 'deny' },
        { role: 'viewer', action: 'read', resource: '*', effect: 'allow' },
      ],
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'secret'), false);
    assert.equal(adapter.can('read', 'article'), true);
  });

  test('no user set returns defaultEffect', () => {
    const adapterDeny = createStaticRulesAdapter({ rules: [] });
    assert.equal(adapterDeny.can('read', 'article'), false);

    const adapterAllow = createStaticRulesAdapter({ rules: [], defaultEffect: 'allow' });
    assert.equal(adapterAllow.can('read', 'article'), true);
  });
});

// ---------------------------------------------------------------------------
// createDynamicPermissionAdapter
// ---------------------------------------------------------------------------

describe('permission adapter — createDynamicPermissionAdapter()', () => {
  test('passes assertPermissionPort', () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
    });
    assert.doesNotThrow(() => assertPermissionPort(adapter));
  });

  test('throws when no checkFn provided', () => {
    assert.throws(() => createDynamicPermissionAdapter(/** @type {any} */ ({})), {
      message: /check function/i,
    });
  });

  test('returns defaultEffect (deny) for uncached permission', () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'article'), false);
  });

  test('returns defaultEffect (allow) when configured', () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => false,
      defaultEffect: 'allow',
    });
    adapter.setUser({ role: 'viewer' });
    assert.equal(adapter.can('read', 'article'), true);
  });

  test('checkFn result is used after prefetch', async () => {
    let callCount = 0;
    const adapter = createDynamicPermissionAdapter({
      checkFn: async (_user, action, _resource) => {
        callCount++;
        return action === 'read';
      },
    });
    adapter.setUser({ role: 'viewer' });

    await adapter.prefetch('read', 'article');
    assert.equal(adapter.can('read', 'article'), true);
    assert.equal(callCount, 1);
  });

  test('cannot() is inverse of can()', async () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
    });
    adapter.setUser({ role: 'viewer' });
    await adapter.prefetch('read', 'article');

    assert.equal(adapter.can('read', 'article'), true);
    assert.equal(adapter.cannot('read', 'article'), false);
  });

  test('caching works — checkFn called once for same action/resource', async () => {
    let callCount = 0;
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => {
        callCount++;
        return true;
      },
    });
    adapter.setUser({ role: 'viewer' });

    await adapter.prefetch('read', 'article');
    adapter.can('read', 'article');
    adapter.can('read', 'article');
    assert.equal(callCount, 1);
  });

  test('invalidateCache() forces re-check on next prefetch', async () => {
    let callCount = 0;
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => {
        callCount++;
        return true;
      },
    });
    adapter.setUser({ role: 'viewer' });

    await adapter.prefetch('read', 'article');
    assert.equal(callCount, 1);

    adapter.invalidateCache();
    // After invalidation, can() returns defaultEffect (deny) until re-prefetch
    assert.equal(adapter.can('read', 'article'), false);

    await adapter.prefetch('read', 'article');
    assert.equal(callCount, 2);
    assert.equal(adapter.can('read', 'article'), true);
  });

  test('missing grantFn throws clear error', () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
    });
    assert.throws(
      () => adapter.grant({ role: 'viewer', action: 'read', resource: 'article', effect: 'allow' }),
      { message: /grantFn/i },
    );
  });

  test('missing revokeFn throws clear error', () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
    });
    assert.throws(() => adapter.revoke('read', 'article'), { message: /revokeFn/i });
  });

  test('grant() delegates to injected grantFn', () => {
    let grantedRule = null;
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
      grantFn: async (rule) => {
        grantedRule = rule;
      },
    });
    const rule = {
      role: 'viewer',
      action: 'read',
      resource: 'article',
      effect: /** @type {const} */ ('allow'),
    };
    adapter.grant(rule);
    assert.deepEqual(grantedRule, rule);
  });

  test('revoke() delegates to injected revokeFn', () => {
    let revokedArgs = null;
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
      revokeFn: async (action, resource, role) => {
        revokedArgs = { action, resource, role };
      },
    });
    adapter.revoke('read', 'article', 'viewer');
    assert.deepEqual(revokedArgs, { action: 'read', resource: 'article', role: 'viewer' });
  });

  test('destroy() clears cache', async () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
    });
    adapter.setUser({ role: 'viewer' });
    await adapter.prefetch('read', 'article');
    assert.equal(adapter.can('read', 'article'), true);

    adapter.destroy();
    // After destroy, no user and cache cleared
    assert.equal(adapter.can('read', 'article'), false);
  });

  test('getRulesForRole() returns empty array for dynamic adapter', () => {
    const adapter = createDynamicPermissionAdapter({
      checkFn: async () => true,
    });
    assert.deepEqual(adapter.getRulesForRole('viewer'), []);
  });
});
