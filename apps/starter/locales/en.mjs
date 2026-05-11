/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose English locale catalog providing all i18n message keys for the starter app, including PWA strings.
 * @sidecar en.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * English locale catalog for the starter app.
 * This is the default/fallback locale.
 */
export const en = {
  // Bootstrap
  'greeting.hello': 'Hello, {name}!',
  'status.ready': 'Ready',
  'status.loading': 'Loading\u2026',

  // Language picker
  'language-picker.label': 'Language',
  'language-picker.en': 'English',
  'language-picker.ru': 'Russian',

  // Theme toggle
  'theme-toggle.label': 'Theme',
  'theme-toggle.light': 'Light',
  'theme-toggle.dark': 'Dark',
  'theme-toggle.system': 'System',

  // Layout
  'layout.skip-to-content': 'Skip to content',
  'layout.footer.copyright': '\u00a9 {year} Project',

  // Navigation
  'navigation.menu': 'Menu',

  // Notifications
  'notification.dismiss': 'Dismiss',
  'notification.close': 'Close',

  // Loading
  'loading.text': 'Loading\u2026',
  'loading.sr-only': 'Content is loading',

  // Error boundary
  'error.title': 'Something went wrong',
  'error.description': 'An unexpected error occurred. Please try again.',
  'error.retry': 'Try again',

  // PWA
  'pwa.install': 'Install App',
  'pwa.install.description': 'Install this app for a better experience',
  'pwa.update.available': 'Update available',
  'pwa.update.apply': 'Apply update',
  'pwa.offline': 'You are offline',
};
