/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory adapter for the onboarding module.
 * @sidecar memory-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx onboarding
 * @public false
 * @edit careful
 */

/**
 * In-memory onboarding adapter for testing.
 * No DOM, no side effects — pure state tracking.
 *
 * @param {object} [options]
 * @param {((index: number) => void)} [options.onStepChange] — called when step changes
 * @param {(() => void)} [options.onComplete] — called when tour ends naturally
 * @returns {import('../ports/onboarding-port.mjs').OnboardingPort & { getState: () => import('../domain/tour-state.mjs').TourState | null }}
 */
export function createMemoryOnboardingAdapter(options = {}) {
  const { onStepChange, onComplete } = options;

  /** @type {import('../domain/tour-state.mjs').TourState | null} */
  let state = null;

  function notify() {
    if (state?.active) {
      onStepChange?.(state.currentIndex);
    }
  }

  return {
    startTour(steps) {
      const sorted = [...steps].sort((a, b) => a.order - b.order);
      state = { steps: sorted, currentIndex: 0, active: true };
      if (sorted.length === 0) {
        state.active = false;
        state.currentIndex = -1;
      }
      notify();
    },

    endTour() {
      if (state) {
        state = { ...state, currentIndex: -1, active: false };
        onComplete?.();
      }
    },

    nextStep() {
      if (!state?.active) return;
      if (state.currentIndex >= state.steps.length - 1) {
        this.endTour();
        return;
      }
      state = { ...state, currentIndex: state.currentIndex + 1 };
      notify();
    },

    previousStep() {
      if (!state?.active || state.currentIndex <= 0) return;
      state = { ...state, currentIndex: state.currentIndex - 1 };
      notify();
    },

    isActive() {
      return state?.active ?? false;
    },

    getCurrentIndex() {
      return state?.currentIndex ?? -1;
    },

    getState() {
      return state;
    },

    destroy() {
      if (state?.active) {
        state = { ...state, currentIndex: -1, active: false };
      }
      state = null;
    },
  };
}
