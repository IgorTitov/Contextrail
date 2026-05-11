/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Layout for the starter app.
 * @sidecar layout.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Layout skeleton helper.
 * Creates the semantic HTML structure: header, main, footer with skip-to-content.
 */

import { t } from '../messages.mjs';
import { layout } from './ui-selectors.mjs';

/**
 * Create the layout skeleton and append it to a parent element.
 *
 * @param {HTMLElement} parent — container to append the layout to
 * @param {object} [options]
 * @param {string} [options.title] — site title for the header
 * @param {string} [options.footerYear] — copyright year
 * @returns {{ header: HTMLElement, main: HTMLElement, footer: HTMLElement, skipLink: HTMLAnchorElement }}
 */
export function createLayout(parent, options = {}) {
  const { title = '', footerYear = String(new Date().getFullYear()) } = options;

  // Skip-to-content link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.setAttribute('data-testid', layout.skipLink);
  skipLink.textContent = t('layout.skip-to-content');
  parent.appendChild(skipLink);

  // Header
  const header = document.createElement('header');
  header.className = 'site-header';
  header.setAttribute('data-testid', layout.header);
  header.setAttribute('role', 'banner');

  const nav = document.createElement('nav');
  nav.className = 'site-header__nav';
  nav.setAttribute('aria-label', t('navigation.menu'));
  if (title) {
    const titleEl = document.createElement('strong');
    titleEl.textContent = title;
    nav.appendChild(titleEl);
  }
  header.appendChild(nav);

  const controls = document.createElement('div');
  controls.className = 'site-header__controls';
  controls.setAttribute('data-testid', layout.controls);
  header.appendChild(controls);

  parent.appendChild(header);

  // Main
  const main = document.createElement('main');
  main.id = 'main-content';
  main.className = 'site-main';
  main.setAttribute('data-testid', layout.main);
  main.setAttribute('role', 'main');
  main.setAttribute('tabindex', '-1');
  parent.appendChild(main);

  // Footer
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.setAttribute('data-testid', layout.footer);
  footer.setAttribute('role', 'contentinfo');
  footer.textContent = t('layout.footer.copyright', { year: footerYear });
  parent.appendChild(footer);

  return { header, main, footer, skipLink };
}
