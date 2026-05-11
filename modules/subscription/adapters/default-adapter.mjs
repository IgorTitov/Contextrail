/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory subscription adapter for tests and development.
 * @sidecar default-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx subscription
 * @public false
 * @edit careful
 */

import {
  createSubscription,
  hasEntitlement,
  recordUsage,
  transitionStatus,
  changePlan,
} from '../domain/subscription.mjs';

/**
 * Create an in-memory subscription adapter.
 * @param {import('../domain/subscription.mjs').PlanTier[]} plans
 * @returns {import('../ports/subscription-port.mjs').SubscriptionPort}
 */
export function createMemorySubscriptionAdapter(plans) {
  /** @type {Map<string, import('../domain/subscription.mjs').Subscription>} */
  const subscriptions = new Map();

  return {
    async create(input) {
      const result = createSubscription(input, plans);
      if (!result.ok) throw new Error(result.error);
      subscriptions.set(result.subscription.id, result.subscription);
      return result.subscription;
    },

    async getById(id) {
      return subscriptions.get(id) || null;
    },

    async getByUser(userId) {
      for (const sub of subscriptions.values()) {
        if (sub.userId === userId) return sub;
      }
      return null;
    },

    async updateStatus(id, status) {
      const sub = subscriptions.get(id);
      if (!sub) throw new Error('subscription-not-found');
      const result = transitionStatus(sub, status);
      if (!result.ok) throw new Error(result.error);
      subscriptions.set(id, result.subscription);
      return result.subscription;
    },

    async changePlan(id, newPlanId) {
      const sub = subscriptions.get(id);
      if (!sub) throw new Error('subscription-not-found');
      const result = changePlan(sub, newPlanId, plans);
      if (!result.ok) throw new Error(result.error);
      subscriptions.set(id, result.subscription);
      return result.subscription;
    },

    async recordUsage(id, meter, delta = 1) {
      const sub = subscriptions.get(id);
      if (!sub) throw new Error('subscription-not-found');
      const updated = recordUsage(sub, meter, delta);
      subscriptions.set(id, updated);
      return updated;
    },

    async checkEntitlement(userId, entitlement) {
      const sub = await this.getByUser(userId);
      if (!sub) return false;
      return hasEntitlement(sub, plans, entitlement);
    },

    listPlans() {
      return [...plans];
    },

    clear() {
      subscriptions.clear();
    },
  };
}
