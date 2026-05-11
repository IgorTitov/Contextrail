/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the analytics bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex _none_ | @ctx analytics
 * @public true
 * @edit careful
 */

// Ports
export { assertAnalyticsPort } from './ports/analytics-port.mjs';

// Domain
export { createSessionManager } from './domain/session-manager.mjs';
export { isConsentGranted, respectsDoNotTrack, createDefaultConsent } from './domain/consent.mjs';
export { createMouseCollector } from './domain/mouse-collector.mjs';

// Adapters
export { createAnalyticsConsoleAdapter } from './adapters/console-adapter.mjs';
export { createAnalyticsNoOpAdapter } from './adapters/no-op-adapter.mjs';
export { createBehavioralAdapter } from './adapters/behavioral-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
