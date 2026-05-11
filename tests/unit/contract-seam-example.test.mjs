/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the contract-first seam pattern works: injection, call-through, reset, and error on unwired state.
 * @sidecar contract-seam-example.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  notify,
  _setImpl,
  _resetImpl,
} from '../../apps/starter/examples/contract-seam/notifications_contract.mjs';

test('unwired contract throws a clear error', () => {
  _resetImpl();
  assert.throws(() => notify('hello'), /implementation not wired/);
});

test('_setImpl wires the implementation and notify delegates to it', () => {
  const log = [];
  _setImpl({
    notify(message, level) {
      log.push({ message, level });
    },
  });

  notify('saved', 'info');
  notify('disk full', 'error');

  assert.equal(log.length, 2);
  assert.deepStrictEqual(log[0], { message: 'saved', level: 'info' });
  assert.deepStrictEqual(log[1], { message: 'disk full', level: 'error' });

  _resetImpl();
});

test('_resetImpl returns to unwired state', () => {
  _setImpl({ notify() {} });
  notify('ok'); // should not throw
  _resetImpl();
  assert.throws(() => notify('after reset'), /implementation not wired/);
});

test('notify defaults level to info', () => {
  const log = [];
  _setImpl({
    notify(message, level) {
      log.push({ message, level });
    },
  });

  notify('hello');
  assert.equal(log[0].level, 'info');

  _resetImpl();
});

test('implementation can be swapped at runtime', () => {
  const log1 = [];
  const log2 = [];

  _setImpl({
    notify(m) {
      log1.push(m);
    },
  });
  notify('first');

  _setImpl({
    notify(m) {
      log2.push(m);
    },
  });
  notify('second');

  assert.equal(log1.length, 1);
  assert.equal(log2.length, 1);
  assert.equal(log1[0], 'first');
  assert.equal(log2[0], 'second');

  _resetImpl();
});
