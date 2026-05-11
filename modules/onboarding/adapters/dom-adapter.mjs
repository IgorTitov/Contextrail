/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Dom adapter for the onboarding module.
 * @sidecar dom-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx onboarding
 * @public false
 * @edit careful
 */

import { buildTourStylesheet } from '../domain/tour-styles.mjs';

/**
 * Vanilla DOM onboarding adapter.
 * Creates a spotlight overlay with popover for guided tours.
 * Zero external dependencies — uses CSS box-shadow for the overlay cutout.
 *
 * @param {object} [options]
 * @param {string} [options.overlayColor='rgba(0, 0, 0, 0.65)']
 * @param {number} [options.padding=10] — padding around highlighted element
 * @param {number} [options.borderRadius=8]
 * @param {number} [options.zIndex=100000]
 * @param {string} [options.scrollBehavior='smooth']
 * @param {((index: number) => void)} [options.onStepChange]
 * @param {(() => void)} [options.onComplete]
 * @returns {import('../ports/onboarding-port.mjs').OnboardingPort}
 */
export function createDomOnboardingAdapter(options = {}) {
  const {
    overlayColor = 'rgba(0, 0, 0, 0.65)',
    padding = 10,
    borderRadius = 8,
    zIndex = 100000,
    scrollBehavior = 'smooth',
    onStepChange,
    onComplete,
  } = options;

  /** @type {import('../domain/tour-step.mjs').TourStep[]} */
  let steps = [];
  let currentIndex = -1;
  let active = false;

  /** @type {HTMLElement | null} */
  let spotlightEl = null;
  /** @type {HTMLElement | null} */
  let popoverEl = null;
  /** @type {HTMLElement | null} */
  let backdropEl = null;
  /** @type {HTMLStyleElement | null} */
  let styleEl = null;
  /** @type {(() => void) | null} */
  let cleanupListeners = null;

  /* ------------------------------------------------------------------ */
  /*  CSS injection                                                      */
  /* ------------------------------------------------------------------ */

  function injectStyles() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = '__onboarding_styles__';
    styleEl.textContent = buildTourStylesheet({ overlayColor, borderRadius, zIndex });
    document.head.appendChild(styleEl);
  }

  /* ------------------------------------------------------------------ */
  /*  DOM creation                                                       */
  /* ------------------------------------------------------------------ */

  function createElements() {
    backdropEl = document.createElement('div');
    backdropEl.className = '__onboarding-backdrop';
    backdropEl.setAttribute('data-testid', 'onboarding-backdrop');
    backdropEl.addEventListener('click', handleBackdropClick);

    spotlightEl = document.createElement('div');
    spotlightEl.className = '__onboarding-spotlight';
    spotlightEl.setAttribute('data-testid', 'onboarding-spotlight');

    popoverEl = document.createElement('div');
    popoverEl.className = '__onboarding-popover';
    popoverEl.setAttribute('data-testid', 'onboarding-popover');
    popoverEl.setAttribute('role', 'dialog');
    popoverEl.setAttribute('aria-label', 'Guided tour');

    document.body.appendChild(backdropEl);
    document.body.appendChild(spotlightEl);
    document.body.appendChild(popoverEl);
  }

  function removeElements() {
    backdropEl?.remove();
    spotlightEl?.remove();
    popoverEl?.remove();
    backdropEl = null;
    spotlightEl = null;
    popoverEl = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Step rendering                                                     */
  /* ------------------------------------------------------------------ */

  function resolveTarget(step) {
    return (
      document.querySelector(`[data-testid="${step.target}"]`) ||
      document.querySelector(step.target)
    );
  }

  function renderStep() {
    const step = steps[currentIndex];
    if (!step || !popoverEl || !spotlightEl) return;

    const target = resolveTarget(step);

    // Position spotlight
    if (target) {
      const rect = target.getBoundingClientRect();
      spotlightEl.style.top = `${rect.top - padding}px`;
      spotlightEl.style.left = `${rect.left - padding}px`;
      spotlightEl.style.width = `${rect.width + padding * 2}px`;
      spotlightEl.style.height = `${rect.height + padding * 2}px`;
      spotlightEl.style.display = '';

      target.scrollIntoView({ behavior: scrollBehavior, block: 'nearest' });
    } else {
      spotlightEl.style.display = 'none';
    }

    // Detect dark theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    popoverEl.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Build popover content
    const stepLabel = `${currentIndex + 1} / ${steps.length}`;
    const isLast = currentIndex === steps.length - 1;
    const isFirst = currentIndex === 0;

    popoverEl.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.className = '__onboarding-btn __onboarding-btn--close';
    closeBtn.setAttribute('data-testid', 'onboarding-close');
    closeBtn.setAttribute('aria-label', 'Close tour');
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => endTourAction());
    popoverEl.appendChild(closeBtn);

    const title = document.createElement('h3');
    title.className = '__onboarding-title';
    title.setAttribute('data-testid', 'onboarding-title');
    title.textContent = step.title;
    popoverEl.appendChild(title);

    const desc = document.createElement('p');
    desc.className = '__onboarding-description';
    desc.setAttribute('data-testid', 'onboarding-description');
    desc.textContent = step.description;
    popoverEl.appendChild(desc);

    const footer = document.createElement('div');
    footer.className = '__onboarding-footer';

    const counter = document.createElement('span');
    counter.className = '__onboarding-step-counter';
    counter.setAttribute('data-testid', 'onboarding-counter');
    counter.textContent = stepLabel;
    footer.appendChild(counter);

    const buttons = document.createElement('div');
    buttons.className = '__onboarding-buttons';

    if (!isFirst) {
      const prevBtn = document.createElement('button');
      prevBtn.className = '__onboarding-btn __onboarding-btn--prev';
      prevBtn.setAttribute('data-testid', 'onboarding-prev');
      prevBtn.textContent = 'Back';
      prevBtn.addEventListener('click', () => prevAction());
      buttons.appendChild(prevBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = '__onboarding-btn __onboarding-btn--next';
    nextBtn.setAttribute('data-testid', 'onboarding-next');
    nextBtn.textContent = isLast ? 'Done' : 'Next';
    nextBtn.addEventListener('click', () => nextAction());
    buttons.appendChild(nextBtn);

    footer.appendChild(buttons);
    popoverEl.appendChild(footer);

    // Position popover relative to target
    positionPopover(step.position, target);

    onStepChange?.(currentIndex);
  }

  function positionPopover(position, target) {
    if (!popoverEl) return;

    // Reset positioning
    popoverEl.style.top = '';
    popoverEl.style.bottom = '';
    popoverEl.style.left = '';
    popoverEl.style.right = '';

    if (!target) {
      // Center on screen when target is missing
      popoverEl.style.top = '50%';
      popoverEl.style.left = '50%';
      popoverEl.style.transform = 'translate(-50%, -50%)';
      return;
    }

    popoverEl.style.transform = '';
    const rect = target.getBoundingClientRect();
    const gap = 12;

    switch (position) {
      case 'top':
        popoverEl.style.left = `${rect.left}px`;
        popoverEl.style.bottom = `${window.innerHeight - rect.top + padding + gap}px`;
        break;
      case 'left':
        popoverEl.style.top = `${rect.top}px`;
        popoverEl.style.right = `${window.innerWidth - rect.left + padding + gap}px`;
        break;
      case 'right':
        popoverEl.style.top = `${rect.top}px`;
        popoverEl.style.left = `${rect.right + padding + gap}px`;
        break;
      case 'bottom':
      default:
        popoverEl.style.top = `${rect.bottom + padding + gap}px`;
        popoverEl.style.left = `${rect.left}px`;
        break;
    }

    // Clamp popover within viewport
    requestAnimationFrame(() => {
      if (!popoverEl) return;
      const pr = popoverEl.getBoundingClientRect();
      if (pr.right > window.innerWidth - 12) {
        popoverEl.style.left = '';
        popoverEl.style.right = '12px';
      }
      if (pr.bottom > window.innerHeight - 12) {
        popoverEl.style.top = '';
        popoverEl.style.bottom = '12px';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */

  function nextAction() {
    if (!active) return;
    if (currentIndex >= steps.length - 1) {
      endTourAction();
      return;
    }
    currentIndex++;
    renderStep();
  }

  function prevAction() {
    if (!active || currentIndex <= 0) return;
    currentIndex--;
    renderStep();
  }

  function endTourAction() {
    active = false;
    currentIndex = -1;
    removeElements();
    teardownListeners();
    onComplete?.();
  }

  /* ------------------------------------------------------------------ */
  /*  Keyboard & resize                                                  */
  /* ------------------------------------------------------------------ */

  function handleKeydown(e) {
    if (!active) return;
    switch (e.key) {
      case 'Escape':
        endTourAction();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextAction();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        prevAction();
        break;
    }
  }

  function handleResize() {
    if (active) renderStep();
  }

  function handleBackdropClick() {
    endTourAction();
  }

  function setupListeners() {
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleResize);
    cleanupListeners = () => {
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleResize);
    };
  }

  function teardownListeners() {
    cleanupListeners?.();
    cleanupListeners = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API (OnboardingPort)                                        */
  /* ------------------------------------------------------------------ */

  return {
    startTour(tourSteps) {
      if (active) this.endTour();
      steps = [...tourSteps].sort((a, b) => a.order - b.order);
      if (steps.length === 0) return;
      currentIndex = 0;
      active = true;
      injectStyles();
      createElements();
      setupListeners();
      renderStep();
    },

    endTour() {
      endTourAction();
    },

    nextStep() {
      nextAction();
    },

    previousStep() {
      prevAction();
    },

    isActive() {
      return active;
    },

    getCurrentIndex() {
      return currentIndex;
    },

    destroy() {
      if (active) endTourAction();
      styleEl?.remove();
      styleEl = null;
    },
  };
}
