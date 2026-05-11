/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose BDD step runner proving the example-greeter Gherkin scenarios against the real module.
 * @sidecar example-greeter.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  greet,
  assertGreetingPort,
  defaultGreetingAdapter,
} from '../../modules/example-greeter/public-api.mjs';

const feature = readFileSync(
  new URL('./features/example-greeter.feature', import.meta.url),
  'utf8',
);

describe('Feature: Greeting a user by name', () => {
  test('feature file contains the expected scenarios', () => {
    assert.ok(feature.includes('Feature: Greeting a user by name'));
    assert.ok(feature.includes('Scenario: Greet with the default adapter'));
    assert.ok(feature.includes('Scenario: Empty name produces no greeting'));
    assert.ok(feature.includes('Scenario: Greet with a custom adapter'));
  });

  test('Scenario: Greet with the default adapter', () => {
    // Given the default greeting adapter is active
    assertGreetingPort(defaultGreetingAdapter);
    const template = defaultGreetingAdapter.getTemplate();

    // When I greet "Alice"
    const result = greet('Alice', template);

    // Then the result should be "Hello, Alice!"
    assert.equal(result, 'Hello, Alice!');
  });

  test('Scenario: Empty name produces no greeting', () => {
    // Given the default greeting adapter is active
    const template = defaultGreetingAdapter.getTemplate();

    // When I greet ""
    const result = greet('', template);

    // Then the result should be ""
    assert.equal(result, '');
  });

  test('Scenario: Greet with a custom adapter', () => {
    // Given a custom adapter that returns "Howdy, {name}!"
    const customAdapter = { getTemplate: () => 'Howdy, {name}!' };
    assertGreetingPort(customAdapter);
    const template = customAdapter.getTemplate();

    // When I greet "Bob"
    const result = greet('Bob', template);

    // Then the result should be "Howdy, Bob!"
    assert.equal(result, 'Howdy, Bob!');
  });
});
