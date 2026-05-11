/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure domain logic for subscription lifecycle — plan tiers, entitlements, and subscription state transitions.
 * @sidecar subscription.mjs.header.md
 * @layer domain | @hex _none_ | @ctx subscription
 * @public false
 * @edit careful
 */

/**
 * @typedef {'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'} SubscriptionStatus
 */

/**
 * @typedef {Object} PlanTier
 * @property {string} id - e.g. 'free', 'starter', 'pro', 'enterprise'
 * @property {string} name
 * @property {string[]} entitlements - feature keys this plan grants
 * @property {number} [maxSeats] - seat limit (undefined = unlimited)
 * @property {number} [priceMonthly] - cents
 * @property {number} [priceYearly] - cents
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id
 * @property {string} userId
 * @property {string} planId
 * @property {SubscriptionStatus} status
 * @property {string} currentPeriodStart - ISO date
 * @property {string} currentPeriodEnd - ISO date
 * @property {string} [canceledAt] - ISO date
 * @property {string} createdAt - ISO date
 * @property {Record<string, number>} [usage] - metered usage counters
 */

/**
 * @typedef {Object} SubscriptionInput
 * @property {string} userId
 * @property {string} planId
 * @property {'monthly' | 'yearly'} [interval]
 */

/** Valid status transitions. */
const TRANSITIONS = {
  trialing: ['active', 'canceled', 'expired'],
  active: ['past_due', 'canceled'],
  past_due: ['active', 'canceled', 'expired'],
  canceled: ['expired'],
  expired: [],
};

/**
 * Check whether a status transition is valid.
 * @param {SubscriptionStatus} from
 * @param {SubscriptionStatus} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Create a new subscription in trialing or active state.
 * @param {SubscriptionInput} input
 * @param {PlanTier[]} plans
 * @returns {{ ok: true, subscription: Subscription } | { ok: false, error: string }}
 */
export function createSubscription(input, plans) {
  const plan = plans.find((p) => p.id === input.planId);
  if (!plan) return { ok: false, error: 'unknown-plan' };

  const now = new Date();
  const periodEnd = new Date(now);
  if (input.interval === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return {
    ok: true,
    subscription: {
      id: `sub_${Date.now()}`,
      userId: input.userId,
      planId: input.planId,
      status: plan.priceMonthly === 0 || plan.priceMonthly == null ? 'active' : 'trialing',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      createdAt: now.toISOString(),
      usage: {},
    },
  };
}

/**
 * Check if a subscription grants a specific entitlement.
 * @param {Subscription} subscription
 * @param {PlanTier[]} plans
 * @param {string} entitlement - feature key to check
 * @returns {boolean}
 */
export function hasEntitlement(subscription, plans, entitlement) {
  if (subscription.status === 'canceled' || subscription.status === 'expired') return false;
  const plan = plans.find((p) => p.id === subscription.planId);
  if (!plan) return false;
  return plan.entitlements.includes(entitlement);
}

/**
 * Record usage for a metered entitlement.
 * @param {Subscription} subscription
 * @param {string} meter - usage key
 * @param {number} [delta=1]
 * @returns {Subscription}
 */
export function recordUsage(subscription, meter, delta = 1) {
  const usage = { ...subscription.usage };
  usage[meter] = (usage[meter] || 0) + delta;
  return { ...subscription, usage };
}

/**
 * Transition subscription to a new status.
 * @param {Subscription} subscription
 * @param {SubscriptionStatus} newStatus
 * @returns {{ ok: true, subscription: Subscription } | { ok: false, error: string }}
 */
export function transitionStatus(subscription, newStatus) {
  if (!canTransition(subscription.status, newStatus)) {
    return { ok: false, error: `invalid-transition:${subscription.status}->${newStatus}` };
  }
  const updated = { ...subscription, status: newStatus };
  if (newStatus === 'canceled') {
    updated.canceledAt = new Date().toISOString();
  }
  return { ok: true, subscription: updated };
}

/**
 * Change plan (upgrade/downgrade). Resets entitlements to the new plan.
 * @param {Subscription} subscription
 * @param {string} newPlanId
 * @param {PlanTier[]} plans
 * @returns {{ ok: true, subscription: Subscription } | { ok: false, error: string }}
 */
export function changePlan(subscription, newPlanId, plans) {
  if (subscription.status === 'canceled' || subscription.status === 'expired') {
    return { ok: false, error: 'cannot-change-plan-on-inactive' };
  }
  const plan = plans.find((p) => p.id === newPlanId);
  if (!plan) return { ok: false, error: 'unknown-plan' };
  return { ok: true, subscription: { ...subscription, planId: newPlanId } };
}
