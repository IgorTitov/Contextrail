/* @HEADER
 * @version 0.6.5 | 2026-04-28
 * @purpose Home React component for the react-starter app.
 * @sidecar Home.jsx.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { selectors } from '../selectors.js';

/**
 * Home page demonstrating hex module integration.
 */
export function Home({ t, onNotify }) {
  return (
    <main data-testid={selectors.main}>
      <h2>{t('home.heading')}</h2>
      <p>{t('home.description')}</p>

      <section>
        <h3>{t('home.hexDemo')}</h3>
        <p>{t('home.hexExplanation')}</p>

        <button
          data-testid={selectors.notifyButton}
          onClick={() => onNotify(t('home.notificationMessage'), 'success')}
        >
          {t('home.triggerNotification')}
        </button>
      </section>
    </main>
  );
}
