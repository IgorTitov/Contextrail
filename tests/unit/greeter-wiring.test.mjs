/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the greeter wiring example — application-layer assembly through public-api.mjs.
 * @sidecar greeter-wiring.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createGreeter } from '../../apps/starter/examples/greeter-wiring/greeter-app.mjs';

describe('createGreeter() — application-layer wiring', () => {
  test('creates a greeter with the default adapter', () => {
    const greetUser = createGreeter();
    assert.equal(greetUser('World'), 'Hello, World!');
  });

  test('creates a greeter with a custom adapter', () => {
    const greetUser = createGreeter({ getTemplate: () => 'Hi, {name}.' });
    assert.equal(greetUser('Alice'), 'Hi, Alice.');
  });

  test('returns empty string for empty name', () => {
    const greetUser = createGreeter();
    assert.equal(greetUser(''), '');
  });

  test('throws TypeError for invalid adapter', () => {
    assert.throws(() => createGreeter({}), TypeError);
    assert.throws(() => createGreeter(null), TypeError);
  });
});
