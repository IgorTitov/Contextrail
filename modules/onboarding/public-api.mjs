/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the onboarding bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx onboarding
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the onboarding bounded module.
 * The only file other modules may import.
 */

// Domain — Tour (guided walkthrough)
export { createTourStep, isValidStep, resetStepCounter } from './domain/tour-step.mjs';

export {
  createTourState,
  startTour,
  nextStep,
  previousStep,
  endTour,
  getCurrentStep,
  canAdvance,
  canGoBack,
  isFirstStep,
  isLastStep,
} from './domain/tour-state.mjs';

// Domain — Checklist (self-paced task list)
export {
  createChecklistState,
  completeItem,
  uncompleteItem,
  dismissChecklist,
  isItemAvailable,
  getCompletionPercent,
  getGroupedItems,
  getNextItem,
  isAllComplete,
  serializeProgress,
  deserializeProgress,
} from './domain/checklist.mjs';

// Ports
export { assertOnboardingPort } from './ports/onboarding-port.mjs';

// Adapters
export { createMemoryOnboardingAdapter } from './adapters/memory-adapter.mjs';
export { createDomOnboardingAdapter } from './adapters/dom-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
