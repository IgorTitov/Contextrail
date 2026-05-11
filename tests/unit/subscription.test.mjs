/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for subscription module — plan tiers, entitlements, lifecycle, usage metering.
 * @sidecar subscription.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx subscription
 * @public false
 * @edit careful
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSubscription,
  hasEntitlement,
  recordUsage,
  transitionStatus,
  changePlan,
  canTransition,
  assertSubscriptionPort,
  createMemorySubscriptionAdapter,
} from '../../modules/subscription/public-api.mjs';

const PLANS = [
  { id: 'free', name: 'Free', entitlements: ['basic-view'], priceMonthly: 0 },
  {
    id: 'pro',
    name: 'Pro',
    entitlements: ['basic-view', 'export', 'api-access'],
    priceMonthly: 1999,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    entitlements: ['basic-view', 'export', 'api-access', 'sso', 'audit-log'],
    priceMonthly: 9999,
    maxSeats: 100,
  },
];

describe('subscription domain — createSubscription()', () => {
  test('creates free plan as active', () => {
    const result = createSubscription({ userId: 'u1', planId: 'free' }, PLANS);
    assert.ok(result.ok);
    assert.equal(result.subscription.status, 'active');
    assert.equal(result.subscription.planId, 'free');
  });

  test('creates paid plan as trialing', () => {
    const result = createSubscription({ userId: 'u1', planId: 'pro' }, PLANS);
    assert.ok(result.ok);
    assert.equal(result.subscription.status, 'trialing');
  });

  test('rejects unknown plan', () => {
    const result = createSubscription({ userId: 'u1', planId: 'nope' }, PLANS);
    assert.equal(result.ok, false);
    assert.equal(result.error, 'unknown-plan');
  });
});

describe('subscription domain — hasEntitlement()', () => {
  test('returns true for granted entitlement', () => {
    const sub = createSubscription({ userId: 'u1', planId: 'pro' }, PLANS).subscription;
    assert.ok(hasEntitlement(sub, PLANS, 'export'));
  });

  test('returns false for ungrantted entitlement', () => {
    const sub = createSubscription({ userId: 'u1', planId: 'free' }, PLANS).subscription;
    assert.equal(hasEntitlement(sub, PLANS, 'export'), false);
  });

  test('returns false for canceled subscription', () => {
    let sub = createSubscription({ userId: 'u1', planId: 'pro' }, PLANS).subscription;
    sub = { ...sub, status: 'canceled' };
    assert.equal(hasEntitlement(sub, PLANS, 'export'), false);
  });
});

describe('subscription domain — transitions', () => {
  test('trialing → active', () => {
    assert.ok(canTransition('trialing', 'active'));
  });

  test('active → past_due', () => {
    assert.ok(canTransition('active', 'past_due'));
  });

  test('active → expired is invalid', () => {
    assert.equal(canTransition('active', 'expired'), false);
  });

  test('transitionStatus rejects invalid transition', () => {
    const sub = createSubscription({ userId: 'u1', planId: 'free' }, PLANS).subscription;
    const result = transitionStatus(sub, 'expired');
    assert.equal(result.ok, false);
  });
});

describe('subscription domain — usage metering', () => {
  test('records usage', () => {
    let sub = createSubscription({ userId: 'u1', planId: 'pro' }, PLANS).subscription;
    sub = recordUsage(sub, 'api-calls', 5);
    assert.equal(sub.usage['api-calls'], 5);
    sub = recordUsage(sub, 'api-calls', 3);
    assert.equal(sub.usage['api-calls'], 8);
  });
});

describe('subscription domain — changePlan()', () => {
  test('upgrades plan', () => {
    const sub = createSubscription({ userId: 'u1', planId: 'pro' }, PLANS).subscription;
    const result = changePlan(sub, 'enterprise', PLANS);
    assert.ok(result.ok);
    assert.equal(result.subscription.planId, 'enterprise');
  });

  test('rejects change on canceled', () => {
    let sub = createSubscription({ userId: 'u1', planId: 'pro' }, PLANS).subscription;
    sub = { ...sub, status: 'canceled' };
    const result = changePlan(sub, 'enterprise', PLANS);
    assert.equal(result.ok, false);
  });
});

describe('subscription adapter — memory', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMemorySubscriptionAdapter(PLANS);
  });

  test('satisfies port contract', () => {
    assert.doesNotThrow(() => assertSubscriptionPort(adapter));
  });

  test('create + getByUser', async () => {
    const sub = await adapter.create({ userId: 'u1', planId: 'pro' });
    const found = await adapter.getByUser('u1');
    assert.equal(found.id, sub.id);
  });

  test('checkEntitlement', async () => {
    await adapter.create({ userId: 'u1', planId: 'pro' });
    assert.ok(await adapter.checkEntitlement('u1', 'export'));
    assert.equal(await adapter.checkEntitlement('u1', 'sso'), false);
  });

  test('listPlans', () => {
    assert.equal(adapter.listPlans().length, 3);
  });

  test('clear', async () => {
    await adapter.create({ userId: 'u1', planId: 'pro' });
    adapter.clear();
    assert.equal(await adapter.getByUser('u1'), null);
  });
});
