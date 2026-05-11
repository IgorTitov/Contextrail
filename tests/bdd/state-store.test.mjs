/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of state-store-test in this repository.
 * @sidecar state-store.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for state-store.feature.
 * Proves user-visible state management behavior through the state module public API.
 *
 * SpecRefs: TPL-043; TPL-048
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMemoryStateAdapter } from '../../modules/state/public-api.mjs';

const feature = readFileSync(new URL('./features/state-store.feature', import.meta.url), 'utf8');

describe('Feature: Observable state store', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Observable state store'));
    assert.ok(feature.includes('Scenario: Store returns its initial state'));
    assert.ok(feature.includes('Scenario: Store updates state with a direct value'));
    assert.ok(feature.includes('Scenario: Store updates state with an updater function'));
    assert.ok(feature.includes('Scenario: Subscribers are notified on state change'));
    assert.ok(feature.includes('Scenario: Unsubscribed listeners stop receiving updates'));
    assert.ok(feature.includes('Scenario: Subscriber count reflects active listeners'));
  });

  test('Scenario: Store returns its initial state', () => {
    // Given a store initialised with value "hello"
    const store = createMemoryStateAdapter('hello');

    // Then the store state is "hello"
    assert.equal(store.getState(), 'hello');
  });

  test('Scenario: Store updates state with a direct value', () => {
    // Given a store initialised with value "before"
    const store = createMemoryStateAdapter('before');

    // When the state is set to "after"
    store.setState('after');

    // Then the store state is "after"
    assert.equal(store.getState(), 'after');
  });

  test('Scenario: Store updates state with an updater function', () => {
    // Given a store initialised with value 0
    const store = createMemoryStateAdapter(0);

    // When the state is updated with an increment function
    store.setState((prev) => prev + 1);

    // Then the store state is 1
    assert.equal(store.getState(), 1);
  });

  test('Scenario: Subscribers are notified on state change', () => {
    // Given a store initialised with value "initial"
    const store = createMemoryStateAdapter('initial');

    // And a subscriber is listening
    let notified = null;
    store.subscribe((state) => {
      notified = state;
    });

    // When the state is set to "changed"
    store.setState('changed');

    // Then the subscriber was notified with "changed"
    assert.equal(notified, 'changed');
  });

  test('Scenario: Unsubscribed listeners stop receiving updates', () => {
    // Given a store initialised with value "initial"
    const store = createMemoryStateAdapter('initial');

    // And a subscriber is listening
    let notified = null;
    const unsubscribe = store.subscribe((state) => {
      notified = state;
    });

    // When the subscriber unsubscribes
    unsubscribe();

    // And the state is set to "silent"
    store.setState('silent');

    // Then the subscriber was not notified
    assert.equal(notified, null);
  });

  test('Scenario: Subscriber count reflects active listeners', () => {
    // Given a store initialised with value "test"
    const store = createMemoryStateAdapter('test');

    // When 3 subscribers are added
    const unsubs = [];
    for (let i = 0; i < 3; i++) {
      unsubs.push(store.subscribe(() => {}));
    }

    // Then the subscriber count is 3
    assert.equal(store.subscriberCount(), 3);

    // When 1 subscriber unsubscribes
    unsubs[0]();

    // Then the subscriber count is 2
    assert.equal(store.subscriberCount(), 2);
  });
});
