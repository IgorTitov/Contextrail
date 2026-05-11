/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for onboarding module — tour steps, state machine, port assertion, memory adapter, and module-local messages.
 * @sidecar onboarding.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTourStep,
  isValidStep,
  resetStepCounter,
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
  assertOnboardingPort,
  createMemoryOnboardingAdapter,
  t,
  setLocale,
  getLocale,
  registerLocale,
  resetLocale,
} from '../../modules/onboarding/public-api.mjs';

beforeEach(() => {
  resetStepCounter();
  resetLocale();
});

/* ------------------------------------------------------------------ */
/*  Domain — createTourStep                                            */
/* ------------------------------------------------------------------ */

describe('onboarding domain — createTourStep()', () => {
  test('creates a step with defaults', () => {
    const step = createTourStep('my-element', 'Title', 'Description');
    assert.equal(step.target, 'my-element');
    assert.equal(step.title, 'Title');
    assert.equal(step.description, 'Description');
    assert.equal(step.position, 'bottom');
    assert.equal(step.order, 0);
    assert.ok(step.id.startsWith('step-'));
  });

  test('accepts custom position and order', () => {
    const step = createTourStep('el', 'T', 'D', { position: 'top', order: 5 });
    assert.equal(step.position, 'top');
    assert.equal(step.order, 5);
  });

  test('accepts custom id', () => {
    const step = createTourStep('el', 'T', 'D', { id: 'custom-id' });
    assert.equal(step.id, 'custom-id');
  });

  test('generates unique IDs', () => {
    const a = createTourStep('a', 'A', 'A');
    const b = createTourStep('b', 'B', 'B');
    assert.notEqual(a.id, b.id);
  });
});

describe('onboarding domain — isValidStep()', () => {
  test('returns true for a valid step', () => {
    const step = createTourStep('el', 'T', 'D');
    assert.ok(isValidStep(step));
  });

  test('returns false for null', () => {
    assert.ok(!isValidStep(null));
  });

  test('returns false for missing fields', () => {
    assert.ok(!isValidStep({ id: 'x', target: 'y' }));
  });

  test('returns false for wrong types', () => {
    assert.ok(
      !isValidStep({ id: 1, target: 'y', title: 'T', description: 'D', position: 'top', order: 0 }),
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Domain — tour state machine                                        */
/* ------------------------------------------------------------------ */

describe('onboarding domain — tour state machine', () => {
  function makeSteps() {
    return [
      createTourStep('a', 'Step A', 'First', { order: 1 }),
      createTourStep('b', 'Step B', 'Second', { order: 2 }),
      createTourStep('c', 'Step C', 'Third', { order: 3 }),
    ];
  }

  test('createTourState sorts steps by order', () => {
    const reversed = [
      createTourStep('c', 'C', 'C', { order: 3 }),
      createTourStep('a', 'A', 'A', { order: 1 }),
      createTourStep('b', 'B', 'B', { order: 2 }),
    ];
    const state = createTourState(reversed);
    assert.equal(state.steps[0].target, 'a');
    assert.equal(state.steps[1].target, 'b');
    assert.equal(state.steps[2].target, 'c');
  });

  test('createTourState starts inactive', () => {
    const state = createTourState(makeSteps());
    assert.equal(state.active, false);
    assert.equal(state.currentIndex, -1);
  });

  test('startTour activates on first step', () => {
    const state = startTour(createTourState(makeSteps()));
    assert.equal(state.active, true);
    assert.equal(state.currentIndex, 0);
  });

  test('startTour is no-op for empty steps', () => {
    const state = startTour(createTourState([]));
    assert.equal(state.active, false);
  });

  test('nextStep advances index', () => {
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state);
    assert.equal(state.currentIndex, 1);
    assert.equal(state.active, true);
  });

  test('nextStep on last step ends tour', () => {
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state);
    state = nextStep(state);
    state = nextStep(state); // past the end
    assert.equal(state.active, false);
    assert.equal(state.currentIndex, -1);
  });

  test('nextStep is no-op when inactive', () => {
    const state = createTourState(makeSteps());
    const result = nextStep(state);
    assert.equal(result, state);
  });

  test('previousStep goes back', () => {
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state);
    state = previousStep(state);
    assert.equal(state.currentIndex, 0);
  });

  test('previousStep is no-op at first step', () => {
    const state = startTour(createTourState(makeSteps()));
    const result = previousStep(state);
    assert.equal(result, state);
  });

  test('previousStep is no-op when inactive', () => {
    const state = createTourState(makeSteps());
    const result = previousStep(state);
    assert.equal(result, state);
  });

  test('endTour deactivates', () => {
    let state = startTour(createTourState(makeSteps()));
    state = endTour(state);
    assert.equal(state.active, false);
    assert.equal(state.currentIndex, -1);
  });

  test('getCurrentStep returns current step', () => {
    const state = startTour(createTourState(makeSteps()));
    const step = getCurrentStep(state);
    assert.equal(step.target, 'a');
  });

  test('getCurrentStep returns null when inactive', () => {
    const state = createTourState(makeSteps());
    assert.equal(getCurrentStep(state), null);
  });

  test('canAdvance is true when not on last step', () => {
    const state = startTour(createTourState(makeSteps()));
    assert.ok(canAdvance(state));
  });

  test('canAdvance is false on last step', () => {
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state);
    state = nextStep(state);
    assert.ok(!canAdvance(state));
  });

  test('canGoBack is false on first step', () => {
    const state = startTour(createTourState(makeSteps()));
    assert.ok(!canGoBack(state));
  });

  test('canGoBack is true on second step', () => {
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state);
    assert.ok(canGoBack(state));
  });

  test('isFirstStep is true at index 0', () => {
    const state = startTour(createTourState(makeSteps()));
    assert.ok(isFirstStep(state));
  });

  test('isLastStep is true at last index', () => {
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state);
    state = nextStep(state);
    assert.ok(isLastStep(state));
  });
});

/* ------------------------------------------------------------------ */
/*  Port — assertOnboardingPort                                        */
/* ------------------------------------------------------------------ */

describe('onboarding port — assertOnboardingPort()', () => {
  const validAdapter = {
    startTour: () => {},
    endTour: () => {},
    nextStep: () => {},
    previousStep: () => {},
    isActive: () => false,
    getCurrentIndex: () => -1,
    destroy: () => {},
  };

  test('accepts a valid adapter', () => {
    assert.doesNotThrow(() => assertOnboardingPort(validAdapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertOnboardingPort(null), TypeError);
  });

  test('throws for undefined', () => {
    assert.throws(() => assertOnboardingPort(undefined), TypeError);
  });

  test('throws for non-object', () => {
    assert.throws(() => assertOnboardingPort('string'), TypeError);
  });

  test('throws for each missing required method', () => {
    for (const method of [
      'startTour',
      'endTour',
      'nextStep',
      'previousStep',
      'isActive',
      'getCurrentIndex',
      'destroy',
    ]) {
      const broken = { ...validAdapter };
      delete broken[method];
      assert.throws(() => assertOnboardingPort(broken), {
        message: `OnboardingPort adapter must implement ${method}()`,
      });
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Memory adapter                                                     */
/* ------------------------------------------------------------------ */

describe('onboarding adapter — memoryOnboardingAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertOnboardingPort(createMemoryOnboardingAdapter()));
  });

  test('starts inactive', () => {
    const adapter = createMemoryOnboardingAdapter();
    assert.equal(adapter.isActive(), false);
    assert.equal(adapter.getCurrentIndex(), -1);
  });

  test('startTour activates with steps', () => {
    const adapter = createMemoryOnboardingAdapter();
    const steps = [createTourStep('a', 'A', 'A', { order: 1 })];
    adapter.startTour(steps);
    assert.equal(adapter.isActive(), true);
    assert.equal(adapter.getCurrentIndex(), 0);
  });

  test('startTour with empty steps stays inactive', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([]);
    assert.equal(adapter.isActive(), false);
  });

  test('nextStep advances index', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([
      createTourStep('a', 'A', 'A', { order: 1 }),
      createTourStep('b', 'B', 'B', { order: 2 }),
    ]);
    adapter.nextStep();
    assert.equal(adapter.getCurrentIndex(), 1);
  });

  test('nextStep on last step ends tour', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([createTourStep('a', 'A', 'A')]);
    adapter.nextStep();
    assert.equal(adapter.isActive(), false);
  });

  test('previousStep goes back', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([
      createTourStep('a', 'A', 'A', { order: 1 }),
      createTourStep('b', 'B', 'B', { order: 2 }),
    ]);
    adapter.nextStep();
    adapter.previousStep();
    assert.equal(adapter.getCurrentIndex(), 0);
  });

  test('previousStep at first step is no-op', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([createTourStep('a', 'A', 'A')]);
    adapter.previousStep();
    assert.equal(adapter.getCurrentIndex(), 0);
  });

  test('endTour deactivates', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([createTourStep('a', 'A', 'A')]);
    adapter.endTour();
    assert.equal(adapter.isActive(), false);
  });

  test('destroy clears state', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([createTourStep('a', 'A', 'A')]);
    adapter.destroy();
    assert.equal(adapter.isActive(), false);
    assert.equal(adapter.getState(), null);
  });

  test('onStepChange callback fires on startTour and nextStep', () => {
    const calls = [];
    const adapter = createMemoryOnboardingAdapter({ onStepChange: (i) => calls.push(i) });
    adapter.startTour([
      createTourStep('a', 'A', 'A', { order: 1 }),
      createTourStep('b', 'B', 'B', { order: 2 }),
    ]);
    adapter.nextStep();
    assert.deepEqual(calls, [0, 1]);
  });

  test('onComplete callback fires when tour ends', () => {
    let completed = false;
    const adapter = createMemoryOnboardingAdapter({
      onComplete: () => {
        completed = true;
      },
    });
    adapter.startTour([createTourStep('a', 'A', 'A')]);
    adapter.endTour();
    assert.ok(completed);
  });

  test('sorts steps by order', () => {
    const adapter = createMemoryOnboardingAdapter();
    adapter.startTour([
      createTourStep('c', 'C', 'C', { order: 3 }),
      createTourStep('a', 'A', 'A', { order: 1 }),
    ]);
    const state = adapter.getState();
    assert.equal(state.steps[0].target, 'a');
    assert.equal(state.steps[1].target, 'c');
  });
});

/* ------------------------------------------------------------------ */
/*  Messages — i18n layer                                              */
/* ------------------------------------------------------------------ */

describe('onboarding messages — i18n', () => {
  test('t() returns English by default', () => {
    assert.equal(t('onboarding.btn.next'), 'Next');
    assert.equal(t('onboarding.btn.back'), 'Back');
    assert.equal(t('onboarding.btn.done'), 'Done');
  });

  test('t() interpolates params', () => {
    assert.equal(t('onboarding.counter', { current: 2, total: 5 }), '2 / 5');
  });

  test('t() returns key for unknown messages', () => {
    assert.equal(t('onboarding.unknown'), 'onboarding.unknown');
  });

  test('setLocale / getLocale round-trips', () => {
    registerLocale('fr', { 'onboarding.btn.next': 'Suivant' });
    setLocale('fr');
    assert.equal(getLocale(), 'fr');
    assert.equal(t('onboarding.btn.next'), 'Suivant');
  });

  test('setLocale throws for unknown locale', () => {
    assert.throws(() => setLocale('zz'), /Unknown locale/);
  });

  test('registerLocale merges with existing', () => {
    registerLocale('en', { 'onboarding.custom': 'Custom' });
    assert.equal(t('onboarding.custom'), 'Custom');
    assert.equal(t('onboarding.btn.next'), 'Next'); // original still exists
  });
});
