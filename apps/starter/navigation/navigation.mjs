/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Navigation for the starter app.
 * @sidecar navigation.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Accessible navigation helpers.
 * Skip-to-content activation, keyboard focus management.
 */

/**
 * Install skip-to-content keyboard handler.
 * When the skip link is activated, focus moves to the target element.
 *
 * @param {HTMLAnchorElement} skipLink — the skip-to-content anchor
 * @param {HTMLElement} target — the element to focus (usually <main>)
 */
export function installSkipLink(skipLink, target) {
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    target.focus();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * Enable keyboard arrow navigation within a list of focusable elements.
 * ArrowDown/ArrowRight moves focus forward, ArrowUp/ArrowLeft moves backward.
 *
 * @param {HTMLElement} container — the nav container with focusable children
 */
export function enableArrowNav(container) {
  container.addEventListener('keydown', (e) => {
    const focusable = /** @type {HTMLElement[]} */ ([
      ...container.querySelectorAll('a, button, select, input, [tabindex="0"]'),
    ]);
    const current = focusable.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (current < 0) return;

    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      next = (current + 1) % focusable.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      next = (current - 1 + focusable.length) % focusable.length;
    }

    if (next >= 0) {
      e.preventDefault();
      focusable[next].focus();
    }
  });
}
