/* @HEADER
 * @version 0.6.5 | 2026-04-28
 * @purpose App React component for the react-starter app.
 * @sidecar App.jsx.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Root component wiring hex module adapters with React.
 *
 * This is the React equivalent of apps/starter/app.mjs.
 * Same hex modules, same domain logic — different UI layer.
 *
 * Layer diagram:
 *
 *   ┌──────────────────────────────────────────┐
 *   │  COA: headers, hex, BBA, agents, gates   │  ← unchanged
 *   ├──────────────────────────────────────────┤
 *   │  Hex modules: domain + ports + adapters  │  ← unchanged (modules/*)
 *   ├──────────────────────────────────────────┤
 *   │  React adapters: hooks wrapping ports    │  ← this layer (src/adapters/)
 *   ├──────────────────────────────────────────┤
 *   │  React components: JSX consuming hooks   │  ← this layer (src/components/)
 *   └──────────────────────────────────────────┘
 */

import { useI18n } from '../adapters/use-i18n.js';
import { useNotifications } from '../adapters/use-notifications.js';
import { usePreferences } from '../adapters/use-preferences.js';
import { Header } from './Header.jsx';
import { NotificationList } from './NotificationList.jsx';
import { Home } from '../pages/Home.jsx';

const messages = {
  en: {
    'app.title': 'Contextrail React Starter',
    'app.switchLocale': 'Switch language',
    'home.heading': 'Hex Modules + React',
    'home.description':
      'This app uses the same hex modules as the vanilla starter. ' +
      'Domain logic is framework-free. Only the React adapter hooks are new.',
    'home.hexDemo': 'Live Demo',
    'home.hexExplanation':
      'Click the button to trigger a notification. The notification domain logic ' +
      '(createNotification, autoDismiss, duration) comes from modules/notifications/. ' +
      'React just provides the rendering.',
    'home.triggerNotification': 'Send notification',
    'home.notificationMessage': 'Hello from hex module!',
  },
  ru: {
    'app.title': 'Contextrail React Starter',
    'app.switchLocale': 'Switch language',
    'home.heading': 'Hex-moduli + React',
    'home.description':
      'Eto prilozhenije ispolzujet te zhe hex-moduli, chto i vanilla starter. ' +
      'Domennaja logika ne zavisit ot frejmvorka. Tolko React-adaptery novyje.',
    'home.hexDemo': 'Demonstracija',
    'home.hexExplanation':
      'Nazhmite knopku, chtoby vyzvat uvedomlenije. Logika uvedomlenij ' +
      '(createNotification, autoDismiss, duration) — iz modules/notifications/. ' +
      'React tolko otrisovyvajet.',
    'home.triggerNotification': 'Otpravit uvedomlenije',
    'home.notificationMessage': 'Privet iz hex-modulja!',
  },
};

export function App() {
  const { preferences, updatePreferences } = usePreferences();
  const { t, locale, setLocale } = useI18n({
    defaultLocale: preferences.locale || 'en',
    messages,
  });
  const { toasts, notify, dismiss } = useNotifications();

  const theme = preferences.theme || 'light';

  function handleThemeToggle(newTheme) {
    updatePreferences({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  function handleLocaleChange(newLocale) {
    setLocale(newLocale);
    updatePreferences({ locale: newLocale });
  }

  return (
    <>
      <Header
        t={t}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />
      <Home t={t} onNotify={notify} />
      <NotificationList toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
