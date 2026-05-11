/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for subscription provider adapters (CRUD, entitlements, usage metering).
 * @sidecar subscription-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx subscription
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * @typedef {import('../domain/subscription.mjs').Subscription} Subscription
 * @typedef {import('../domain/subscription.mjs').SubscriptionInput} SubscriptionInput
 * @typedef {import('../domain/subscription.mjs').SubscriptionStatus} SubscriptionStatus
 * @typedef {import('../domain/subscription.mjs').PlanTier} PlanTier
 *
 * @typedef {Object} SubscriptionPort
 * @property {(input: SubscriptionInput) => Promise<Subscription>} create
 * @property {(id: string) => Promise<Subscription | null>} getById
 * @property {(userId: string) => Promise<Subscription | null>} getByUser
 * @property {(id: string, status: SubscriptionStatus) => Promise<Subscription>} updateStatus
 * @property {(id: string, newPlanId: string) => Promise<Subscription>} changePlan
 * @property {(id: string, meter: string, delta?: number) => Promise<Subscription>} recordUsage
 * @property {(userId: string, entitlement: string) => Promise<boolean>} checkEntitlement
 * @property {() => PlanTier[]} listPlans
 * @property {() => void} clear
 */

const REQUIRED = [
  'create', 'getById', 'getByUser', 'updateStatus',
  'changePlan', 'recordUsage', 'checkEntitlement', 'listPlans', 'clear',
];

/**
 * @param {unknown} adapter
 * @throws {TypeError}
 */
export function assertSubscriptionPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('subscription.port.invalid_adapter'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('subscription.port.missing_method', { method }));
    }
  }
}
