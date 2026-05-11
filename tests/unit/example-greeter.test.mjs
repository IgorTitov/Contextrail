/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the example-greeter bounded module — domain logic, port validation, and adapter compliance.
 * @sidecar example-greeter.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  greet,
  assertGreetingPort,
  defaultGreetingAdapter,
} from '../../modules/example-greeter/public-api.mjs';

describe('example-greeter domain — greet()', () => {
  test('replaces {name} placeholder in the template', () => {
    assert.equal(greet('World', 'Hello, {name}!'), 'Hello, World!');
  });

  test('returns empty string for falsy name', () => {
    assert.equal(greet('', 'Hello, {name}!'), '');
    assert.equal(greet(null, 'Hello, {name}!'), '');
    assert.equal(greet(undefined, 'Hello, {name}!'), '');
  });

  test('works with arbitrary templates', () => {
    assert.equal(greet('Alice', 'Greetings, {name}. Welcome.'), 'Greetings, Alice. Welcome.');
  });

  test('leaves template unchanged if no {name} placeholder', () => {
    assert.equal(greet('Bob', 'No placeholder here'), 'No placeholder here');
  });
});

describe('example-greeter port — assertGreetingPort()', () => {
  test('accepts an adapter with getTemplate()', () => {
    assert.doesNotThrow(() => assertGreetingPort({ getTemplate: () => 'hi' }));
  });

  test('throws TypeError for null adapter', () => {
    assert.throws(() => assertGreetingPort(null), TypeError);
  });

  test('throws TypeError for adapter missing getTemplate', () => {
    assert.throws(() => assertGreetingPort({}), TypeError);
    assert.throws(() => assertGreetingPort({ getTemplate: 'not a fn' }), TypeError);
  });
});

describe('example-greeter adapter — defaultGreetingAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertGreetingPort(defaultGreetingAdapter));
  });

  test('getTemplate() returns a string with {name} placeholder', () => {
    const tpl = defaultGreetingAdapter.getTemplate();
    assert.equal(typeof tpl, 'string');
    assert.ok(tpl.includes('{name}'), 'template must include {name} placeholder');
  });

  test('integrates with greet() end-to-end', () => {
    const result = greet('Template', defaultGreetingAdapter.getTemplate());
    assert.equal(result, 'Hello, Template!');
  });
});
