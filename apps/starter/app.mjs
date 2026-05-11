/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Wire hex module adapters and initialize all app features in dependency order based on the resolved runtime config.
 * @sidecar app.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * App shell — central entry point that wires adapters based on resolved config.
 *
 * This is a thin orchestration layer. It:
 *  1. Resolves the runtime config (mode + flags)
 *  2. Determines which adapters to use for each hex module
 *  3. Initializes features in dependency order
 *  4. Exports initApp(root) for the HTML entry point
 *
 * No framework dependency. Adapter selection is the only mode-aware logic;
 * individual feature modules remain platform-agnostic.
 *
 * Usage (from HTML):
 *   <script type="module">
 *     import { initApp } from './app.mjs';
 *     initApp(document.getElementById('app'));
 *   </script>
 */

import { getMode, getFeatureFlags } from './app-config.mjs';
import { detectEnvironment } from './platform/environment-detect.mjs';
import { resolveStorageType } from './platform/adapter-factory.mjs';
import {
  createMemorySeamAdapter,
  whenEnabled,
  SEAM_STATES,
} from '../../modules/feature-seams/public-api.mjs';

/**
 * Application-level seam registry.
 * Demonstrates live BBA: analytics adapter selection is gated behind a seam.
 * When 'starter.structured-analytics' is active, a structured event adapter
 * replaces the console adapter. Disabled by default — old path runs.
 */
const seams = createMemorySeamAdapter();
seams.register('starter.structured-analytics', {
  state: SEAM_STATES.DISABLED,
  owner: 'starter-app',
  description: 'Migrate analytics from console adapter to structured-event adapter',
  cleanupBy: 'After structured analytics adapter is proven in shadow + active',
});

/**
 * Determine which adapter to use for each hex module based on the current mode
 * and detected environment capabilities.
 *
 * This function is the single point that changes when new adapters are added.
 *
 * @param {object} [envHints] — explicit environment hints for testing
 * @returns {{ storage: string, notifications: string, analytics: string }}
 */
export function getAdapterPlan(envHints) {
  const mode = getMode();
  const caps = detectEnvironment(envHints);
  return {
    storage: resolveStorageType(mode, caps),
    notifications: 'dom',
    analytics: 'console',
  };
}

/**
 * Build an app context containing resolved config + adapter plan.
 * Useful for passing down to initialization functions.
 *
 * @returns {{ mode: string, flags: object, adapterPlan: { storage: string, notifications: string } }}
 */
export function createAppContext() {
  return {
    mode: getMode(),
    flags: getFeatureFlags(),
    adapterPlan: getAdapterPlan(),
  };
}

/**
 * Initialize the starter app inside a root element.
 *
 * Wires hex module adapters and initializes features in dependency order:
 *  1. Preferences (storage adapter)
 *  2. Locale registration
 *  3. Theme (reads from preferences)
 *  4. Layout wiring (skip-link, navigation)
 *  5. Error boundary (catches from this point forward)
 *  6. Notifications (toast DOM adapter)
 *
 * @param {HTMLElement} root — the root element (usually document.body or #app)
 * @param {object} [options]
 * @param {object} [options.overrides] — adapter overrides for testing
 * @returns {Promise<object>} Initialized app context with teardown handle
 */
export async function initApp(root, options = {}) {
  const ctx = createAppContext();

  // --- 1. Preferences ---
  const { defaultPreferences } = await import('../../modules/user-preferences/public-api.mjs');
  const { createStorageAdapter } = await import('./platform/adapter-factory.mjs');
  const { detectEnvironment: detect } = await import('./platform/environment-detect.mjs');

  let storage;
  if (options.overrides?.storage) {
    storage = options.overrides.storage;
  } else {
    try {
      const caps = detect(options.envHints);
      storage = await createStorageAdapter(ctx.mode, caps);
    } catch {
      const { createMemoryAdapter } = await import('../../modules/user-preferences/public-api.mjs');
      storage = createMemoryAdapter();
    }
  }

  let preferences = defaultPreferences();
  try {
    const saved = storage.load();
    if (saved) preferences = saved;
  } catch {
    // Graceful degradation — use defaults
  }

  /** @returns {object} */
  const getPreferences = () => preferences;

  // --- 2. Locale registration ---
  const { registerLocale, setLocale, resetLocale } = await import('./messages.mjs');
  const { en } = await import('./locales/en.mjs');
  const { ru } = await import('./locales/ru.mjs');
  registerLocale('en', en);
  registerLocale('ru', ru);
  try {
    setLocale(preferences.locale || 'en');
  } catch {
    resetLocale();
  }

  // --- 3. Theme ---
  const { applyTheme } = await import('./theme-toggle/theme-toggle.mjs');
  applyTheme(preferences.theme || 'system', root.ownerDocument?.documentElement);

  // --- 4. Error boundary ---
  const { installErrorBoundary } = await import('./error-boundary/error-boundary.mjs');
  const mainEl = root.querySelector?.('main') || root;
  const boundary = installErrorBoundary(mainEl);

  // --- 5. Navigation (skip-link) ---
  const { installSkipLink } = await import('./navigation/navigation.mjs');
  const skipLink = root.querySelector?.('[data-testid="skip-to-content"]');
  const mainContent = root.querySelector?.('#main-content') || mainEl;
  if (skipLink && mainContent) {
    installSkipLink(skipLink, mainContent);
  }

  // --- 6. Notifications ---
  const { createDomNotificationAdapter } =
    await import('../../modules/notifications/public-api.mjs');

  let notificationAdapter;
  if (options.overrides?.notifications) {
    notificationAdapter = options.overrides.notifications;
  } else {
    const container = root.querySelector?.('[data-testid="toast-container"]');
    if (container) {
      notificationAdapter = createDomNotificationAdapter(container);
    }
  }

  // --- 7. Analytics (consent-gated, privacy-first, BBA-gated) ---
  const { createAnalyticsConsoleAdapter, createAnalyticsNoOpAdapter, respectsDoNotTrack } =
    await import('../../modules/analytics/public-api.mjs');

  let analyticsAdapter;
  if (options.overrides?.analytics) {
    analyticsAdapter = options.overrides.analytics;
  } else if (respectsDoNotTrack()) {
    analyticsAdapter = createAnalyticsNoOpAdapter();
  } else {
    // BBA seam: old path = console adapter, new path = structured-event adapter.
    // When the seam is enabled, the structured adapter takes over.
    // This demonstrates a live feature-seams toggle in production-like code.
    analyticsAdapter = whenEnabled(
      seams,
      'starter.structured-analytics',
      () => {
        // New path: structured events (same interface, richer output).
        // For now, wraps console adapter with structured JSON — a real
        // migration would wire to a telemetry endpoint.
        const inner = createAnalyticsConsoleAdapter();
        return {
          ...inner,
          page: (name) => inner.page(`[structured] ${name}`),
          event: (name, data) => inner.event(`[structured] ${name}`, data),
        };
      },
      () => createAnalyticsConsoleAdapter(),
    );
  }
  analyticsAdapter.page('app-init');

  // --- 8. PWA registration (conditional) ---
  let swRegistration = null;
  if (ctx.flags.pwa) {
    try {
      const { registerServiceWorker } = await import('./pwa/pwa-register.mjs');
      swRegistration = await registerServiceWorker('./sw.mjs', { type: 'module' });

      const { initInstallPrompt } = await import('./pwa/install-prompt.mjs');
      initInstallPrompt();
    } catch (err) {
      console.warn('[pwa] PWA initialization failed:', err);
    }
  }

  return {
    ctx,
    seams,
    storage,
    getPreferences,
    notificationAdapter,
    analyticsAdapter,
    swRegistration,
    teardown() {
      boundary.uninstall();
    },
  };
}
