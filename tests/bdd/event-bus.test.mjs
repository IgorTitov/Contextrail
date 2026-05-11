/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of event-bus-test in this repository.
 * @sidecar event-bus.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for event-bus.feature.
 * Proves user-visible behavior through the event-bus module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertEventBusPort, createMemoryEventBus } from '../../modules/event-bus/public-api.mjs';

const feature = readFileSync(new URL('./features/event-bus.feature', import.meta.url), 'utf8');

describe('Feature: Event bus publish/subscribe', () => {
  let bus;

  beforeEach(() => {
    bus = createMemoryEventBus();
    assertEventBusPort(bus);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Event bus publish/subscribe'));
    assert.ok(feature.includes('Scenario: Subscribe and receive an event'));
    assert.ok(feature.includes('Scenario: Multiple handlers receive the same event'));
    assert.ok(feature.includes('Scenario: Unsubscribe stops delivery'));
    assert.ok(feature.includes('Scenario: Clear removes all listeners'));
    assert.ok(feature.includes('Scenario: Emitting an unknown event is silent'));
  });

  test('Scenario: Subscribe and receive an event', () => {
    let received = null;
    bus.on('user:login', (data) => {
      received = data;
    });
    bus.emit('user:login', { userId: 42 });
    assert.deepEqual(received, { userId: 42 });
  });

  test('Scenario: Multiple handlers receive the same event', () => {
    let count = 0;
    bus.on('order:placed', () => {
      count++;
    });
    bus.on('order:placed', () => {
      count++;
    });
    bus.emit('order:placed');
    assert.equal(count, 2);
  });

  test('Scenario: Unsubscribe stops delivery', () => {
    let called = false;
    const handler = () => {
      called = true;
    };
    bus.on('tick', handler);
    bus.off('tick', handler);
    bus.emit('tick');
    assert.equal(called, false);
  });

  test('Scenario: Clear removes all listeners', () => {
    bus.on('a', () => {});
    bus.on('b', () => {});
    bus.clear();
    assert.equal(bus.listenerCount('a'), 0);
    assert.equal(bus.listenerCount('b'), 0);
  });

  test('Scenario: Emitting an unknown event is silent', () => {
    assert.doesNotThrow(() => bus.emit('unknown:event'));
  });
});
