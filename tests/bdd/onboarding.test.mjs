/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of onboarding-test in this repository.
 * @sidecar onboarding.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for onboarding.feature.
 * Proves user-visible onboarding tour behavior through the onboarding module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createTourStep,
  resetStepCounter,
  createTourState,
  startTour,
  nextStep,
  previousStep,
  endTour,
  getCurrentStep,
  canGoBack,
} from '../../modules/onboarding/public-api.mjs';

const feature = readFileSync(new URL('./features/onboarding.feature', import.meta.url), 'utf8');

/** Helper: create a 3-step tour. */
function makeSteps() {
  return [
    createTourStep('#welcome', 'Welcome', 'Start here', { order: 0 }),
    createTourStep('#settings', 'Settings', 'Configure things', { order: 1 }),
    createTourStep('#dashboard', 'Dashboard', 'Overview', { order: 2 }),
  ];
}

describe('Feature: Guided onboarding tour', () => {
  beforeEach(() => {
    resetStepCounter();
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Guided onboarding tour'));
    assert.ok(feature.includes('Scenario: Start a tour and see the first step'));
    assert.ok(feature.includes('Scenario: Advance to the next step'));
    assert.ok(feature.includes('Scenario: Go back to the previous step'));
    assert.ok(feature.includes('Scenario: Cannot go back from the first step'));
    assert.ok(feature.includes('Scenario: Tour ends after the last step'));
    assert.ok(feature.includes('Scenario: End the tour early'));
  });

  test('Scenario: Start a tour and see the first step', () => {
    // Given a tour with steps "Welcome", "Settings", "Dashboard"
    const state = createTourState(makeSteps());

    // When the tour starts
    const started = startTour(state);

    // Then the user sees step "Welcome"
    const current = getCurrentStep(started);
    assert.equal(current.title, 'Welcome');

    // And the tour is active
    assert.equal(started.active, true);
  });

  test('Scenario: Advance to the next step', () => {
    // Given a tour with steps "Welcome", "Settings", "Dashboard"
    // And the tour is started
    let state = startTour(createTourState(makeSteps()));

    // When the user advances to the next step
    state = nextStep(state);

    // Then the user sees step "Settings"
    assert.equal(getCurrentStep(state).title, 'Settings');
  });

  test('Scenario: Go back to the previous step', () => {
    // Given a tour with steps "Welcome", "Settings", "Dashboard"
    // And the tour is on step "Settings"
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state);
    assert.equal(getCurrentStep(state).title, 'Settings');

    // When the user goes back to the previous step
    state = previousStep(state);

    // Then the user sees step "Welcome"
    assert.equal(getCurrentStep(state).title, 'Welcome');
  });

  test('Scenario: Cannot go back from the first step', () => {
    // Given a tour with steps "Welcome", "Settings", "Dashboard"
    // And the tour is started
    const state = startTour(createTourState(makeSteps()));

    // Then the user cannot go back
    assert.equal(canGoBack(state), false);
  });

  test('Scenario: Tour ends after the last step', () => {
    // Given a tour with steps "Welcome", "Settings", "Dashboard"
    // And the tour is on step "Dashboard"
    let state = startTour(createTourState(makeSteps()));
    state = nextStep(state); // Settings
    state = nextStep(state); // Dashboard
    assert.equal(getCurrentStep(state).title, 'Dashboard');

    // When the user advances to the next step
    state = nextStep(state);

    // Then the tour is not active
    assert.equal(state.active, false);
  });

  test('Scenario: End the tour early', () => {
    // Given a tour with steps "Welcome", "Settings", "Dashboard"
    // And the tour is started
    let state = startTour(createTourState(makeSteps()));

    // When the user ends the tour
    state = endTour(state);

    // Then the tour is not active
    assert.equal(state.active, false);
  });
});
