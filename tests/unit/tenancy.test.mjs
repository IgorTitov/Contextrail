/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the tenancy bounded module — tenant value object, context, resolvers, port, memory store, ALS adapter.
 * @sidecar tenancy.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTenant,
  createTenantContext,
  requireTenant,
  withTenant,
  resolveTenantFromHeaders,
  resolveTenantFromSubdomain,
  assertTenantStorePort,
  createMemoryTenantStore,
  createAlsTenantContext,
} from '../../modules/tenancy/public-api.mjs';

describe('tenancy domain — tenant value object', () => {
  test('createTenant accepts a valid slug id', () => {
    const tenant = createTenant({ id: 'acme' });
    assert.equal(tenant.id, 'acme');
    assert.deepEqual(tenant.metadata, {});
    assert.equal(tenant.name, undefined);
  });

  test('createTenant accepts name and metadata', () => {
    const tenant = createTenant({
      id: 'acme-co',
      name: 'Acme, Inc.',
      metadata: { plan: 'pro', region: 'eu' },
    });
    assert.equal(tenant.name, 'Acme, Inc.');
    assert.deepEqual(tenant.metadata, { plan: 'pro', region: 'eu' });
  });

  test('createTenant rejects null and non-object input', () => {
    assert.throws(() => createTenant(null), TypeError);
    assert.throws(() => createTenant('acme'), TypeError);
    assert.throws(() => createTenant(42), TypeError);
  });

  test('createTenant rejects missing or malformed ids', () => {
    assert.throws(() => createTenant({}), TypeError);
    assert.throws(() => createTenant({ id: '' }), TypeError);
    assert.throws(() => createTenant({ id: 'Acme' }), TypeError); // uppercase
    assert.throws(() => createTenant({ id: '-leading' }), TypeError); // leading dash
    assert.throws(() => createTenant({ id: 'has_underscore' }), TypeError);
    assert.throws(() => createTenant({ id: 'has space' }), TypeError);
    assert.throws(() => createTenant({ id: 'a'.repeat(65) }), TypeError); // too long
  });

  test('createTenant accepts single-character and 64-char ids', () => {
    assert.doesNotThrow(() => createTenant({ id: 'a' }));
    assert.doesNotThrow(() => createTenant({ id: 'a'.repeat(64) }));
  });

  test('createTenant rejects non-string name when provided', () => {
    assert.throws(() => createTenant({ id: 'acme', name: 42 }), TypeError);
  });

  test('createTenant rejects non-string metadata values', () => {
    assert.throws(() => createTenant({ id: 'acme', metadata: { ok: 42 } }), TypeError);
    assert.throws(() => createTenant({ id: 'acme', metadata: { ok: null } }), TypeError);
  });

  test('createTenant rejects array metadata', () => {
    assert.throws(() => createTenant({ id: 'acme', metadata: ['nope'] }), TypeError);
  });
});

describe('tenancy domain — tenant context', () => {
  test('createTenantContext defaults to null tenant', () => {
    const ctx = createTenantContext();
    assert.equal(ctx.tenant, null);
  });

  test('createTenantContext accepts a tenant', () => {
    const tenant = createTenant({ id: 'acme' });
    const ctx = createTenantContext(tenant);
    assert.equal(ctx.tenant, tenant);
  });

  test('requireTenant returns the bound tenant', () => {
    const tenant = createTenant({ id: 'acme' });
    const ctx = createTenantContext(tenant);
    assert.equal(requireTenant(ctx), tenant);
  });

  test('requireTenant throws on empty context', () => {
    assert.throws(() => requireTenant(createTenantContext()), TypeError);
    assert.throws(() => requireTenant({ tenant: null }), TypeError);
    assert.throws(() => requireTenant(null), TypeError);
  });

  test('withTenant returns a new context without mutating the original', () => {
    const original = createTenantContext();
    const tenant = createTenant({ id: 'acme' });
    const next = withTenant(original, tenant);
    assert.equal(original.tenant, null);
    assert.equal(next.tenant, tenant);
    assert.notEqual(original, next);
  });

  test('withTenant preserves extra context fields', () => {
    const original = { tenant: null, user: 'alice' };
    const tenant = createTenant({ id: 'acme' });
    const next = withTenant(original, tenant);
    assert.equal(next.user, 'alice');
    assert.equal(next.tenant, tenant);
  });
});

describe('tenancy domain — header resolver', () => {
  test('reads the default x-tenant-id header', () => {
    assert.equal(resolveTenantFromHeaders({ 'x-tenant-id': 'acme' }), 'acme');
  });

  test('returns null when the header is missing', () => {
    assert.equal(resolveTenantFromHeaders({}), null);
  });

  test('honors a custom header name', () => {
    assert.equal(
      resolveTenantFromHeaders({ 'x-account': 'beta' }, { headerName: 'x-account' }),
      'beta',
    );
  });

  test('accepts the first value of an array header', () => {
    assert.equal(resolveTenantFromHeaders({ 'x-tenant-id': ['acme', 'other'] }), 'acme');
  });

  test('trims whitespace and returns null on empty value', () => {
    assert.equal(resolveTenantFromHeaders({ 'x-tenant-id': '  acme  ' }), 'acme');
    assert.equal(resolveTenantFromHeaders({ 'x-tenant-id': '   ' }), null);
  });

  test('throws on non-object headers', () => {
    assert.throws(() => resolveTenantFromHeaders(null), TypeError);
    assert.throws(() => resolveTenantFromHeaders('nope'), TypeError);
    assert.throws(() => resolveTenantFromHeaders([]), TypeError);
  });
});

describe('tenancy domain — subdomain resolver', () => {
  test('extracts the left-most label', () => {
    assert.equal(
      resolveTenantFromSubdomain('acme.example.com', { rootDomain: 'example.com' }),
      'acme',
    );
  });

  test('returns null when host equals root domain', () => {
    assert.equal(resolveTenantFromSubdomain('example.com', { rootDomain: 'example.com' }), null);
  });

  test('returns null for www by default', () => {
    assert.equal(
      resolveTenantFromSubdomain('www.example.com', { rootDomain: 'example.com' }),
      null,
    );
  });

  test('custom ignore list overrides defaults', () => {
    assert.equal(
      resolveTenantFromSubdomain('api.example.com', {
        rootDomain: 'example.com',
        ignore: ['api', 'admin'],
      }),
      null,
    );
    assert.equal(
      resolveTenantFromSubdomain('www.example.com', {
        rootDomain: 'example.com',
        ignore: [],
      }),
      'www',
    );
  });

  test('returns left-most label for multi-level subdomains', () => {
    assert.equal(
      resolveTenantFromSubdomain('acme.api.example.com', { rootDomain: 'example.com' }),
      'acme',
    );
  });

  test('strips :port before matching', () => {
    assert.equal(
      resolveTenantFromSubdomain('acme.example.com:8080', { rootDomain: 'example.com' }),
      'acme',
    );
  });

  test('returns null when host does not end with root domain', () => {
    assert.equal(resolveTenantFromSubdomain('acme.other.com', { rootDomain: 'example.com' }), null);
  });

  test('throws on non-string or empty host', () => {
    assert.throws(() => resolveTenantFromSubdomain('', { rootDomain: 'example.com' }), TypeError);
    assert.throws(() => resolveTenantFromSubdomain(null, { rootDomain: 'example.com' }), TypeError);
  });

  test('throws when rootDomain is missing', () => {
    assert.throws(() => resolveTenantFromSubdomain('acme.example.com', {}), TypeError);
    assert.throws(
      () => resolveTenantFromSubdomain('acme.example.com', { rootDomain: '' }),
      TypeError,
    );
  });
});

describe('tenancy port — assertTenantStorePort', () => {
  test('accepts the memory adapter', () => {
    assert.doesNotThrow(() => assertTenantStorePort(createMemoryTenantStore()));
  });

  test('rejects non-objects', () => {
    assert.throws(() => assertTenantStorePort(null), TypeError);
    assert.throws(() => assertTenantStorePort(42), TypeError);
    assert.throws(() => assertTenantStorePort('store'), TypeError);
  });

  test('rejects adapters missing required methods', () => {
    assert.throws(
      () =>
        assertTenantStorePort({
          createTenant: () => {},
          getTenant: () => {},
          listTenants: () => {},
          deleteTenant: () => {},
          // missing clear
        }),
      TypeError,
    );
    assert.throws(
      () =>
        assertTenantStorePort({
          getTenant: () => {},
          listTenants: () => {},
          deleteTenant: () => {},
          clear: () => {},
          // missing createTenant
        }),
      TypeError,
    );
  });
});

describe('tenancy adapter — memory tenant store', () => {
  test('createTenant stores and returns a defensive copy', async () => {
    const store = createMemoryTenantStore();
    const tenant = await store.createTenant({ id: 'acme', name: 'Acme' });
    assert.equal(tenant.id, 'acme');
    assert.equal(tenant.name, 'Acme');
    // Mutating the returned copy does not leak back into the store.
    tenant.metadata.injected = 'bad';
    const fetched = await store.getTenant('acme');
    assert.equal(fetched.metadata.injected, undefined);
  });

  test('createTenant rejects duplicate ids', async () => {
    const store = createMemoryTenantStore();
    await store.createTenant({ id: 'acme' });
    await assert.rejects(() => store.createTenant({ id: 'acme' }), TypeError);
  });

  test('createTenant validates via the domain', async () => {
    const store = createMemoryTenantStore();
    await assert.rejects(() => store.createTenant({ id: 'BadCase' }), TypeError);
    await assert.rejects(() => store.createTenant({}), TypeError);
  });

  test('getTenant returns null for unknown ids', async () => {
    const store = createMemoryTenantStore();
    assert.equal(await store.getTenant('missing'), null);
  });

  test('listTenants returns a snapshot of all known tenants', async () => {
    const store = createMemoryTenantStore();
    await store.createTenant({ id: 'acme' });
    await store.createTenant({ id: 'beta' });
    const all = store.listTenants();
    assert.equal(all.length, 2);
    assert.ok(all.some((t) => t.id === 'acme'));
    assert.ok(all.some((t) => t.id === 'beta'));
  });

  test('deleteTenant returns true when a row was deleted', async () => {
    const store = createMemoryTenantStore();
    await store.createTenant({ id: 'acme' });
    assert.equal(await store.deleteTenant('acme'), true);
    assert.equal(await store.deleteTenant('acme'), false);
    assert.equal(await store.getTenant('acme'), null);
  });

  test('clear drops every tenant', async () => {
    const store = createMemoryTenantStore();
    await store.createTenant({ id: 'acme' });
    await store.createTenant({ id: 'beta' });
    store.clear();
    assert.equal(store.listTenants().length, 0);
  });

  test('accepts an injectable clock option', () => {
    const store = createMemoryTenantStore({ now: () => 1_700_000_000 });
    assert.equal(typeof store.createTenant, 'function');
  });
});

describe('tenancy adapter — ALS tenant context', () => {
  test('current() returns null outside a run', () => {
    const scope = createAlsTenantContext();
    assert.equal(scope.current(), null);
  });

  test('run() binds a tenant inside its callback', () => {
    const scope = createAlsTenantContext();
    const tenant = createTenant({ id: 'acme' });
    const result = scope.run(tenant, () => {
      assert.equal(scope.current(), tenant);
      return 'ok';
    });
    assert.equal(result, 'ok');
    // Outside the run — scope is cleared again.
    assert.equal(scope.current(), null);
  });

  test('require() returns the bound tenant inside a run', () => {
    const scope = createAlsTenantContext();
    const tenant = createTenant({ id: 'acme' });
    scope.run(tenant, () => {
      assert.equal(scope.require(), tenant);
    });
  });

  test('require() throws outside any run', () => {
    const scope = createAlsTenantContext();
    assert.throws(() => scope.require(), TypeError);
  });

  test('nested run() rebinds the inner scope only', () => {
    const scope = createAlsTenantContext();
    const outer = createTenant({ id: 'outer' });
    const inner = createTenant({ id: 'inner' });
    scope.run(outer, () => {
      assert.equal(scope.current(), outer);
      scope.run(inner, () => {
        assert.equal(scope.current(), inner);
      });
      assert.equal(scope.current(), outer);
    });
  });

  test('two separate scopes are fully isolated', () => {
    const scopeA = createAlsTenantContext();
    const scopeB = createAlsTenantContext();
    const tenant = createTenant({ id: 'acme' });
    scopeA.run(tenant, () => {
      assert.equal(scopeA.current(), tenant);
      assert.equal(scopeB.current(), null);
    });
  });
});
