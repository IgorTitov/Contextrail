/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the subscription module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx subscription
 * @public true
 * @edit careful
 */

// Domain
export {
  createSubscription,
  hasEntitlement,
  recordUsage,
  transitionStatus,
  changePlan,
  canTransition,
} from './domain/subscription.mjs';

// Ports
export { assertSubscriptionPort } from './ports/subscription-port.mjs';

// Adapters
export { createMemorySubscriptionAdapter } from './adapters/default-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
