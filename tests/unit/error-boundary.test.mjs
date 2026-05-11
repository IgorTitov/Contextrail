/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of error-boundary-test in this repository.
 * @sidecar error-boundary.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapAsync } from '../../apps/starter/error-boundary/error-boundary.mjs';

describe('error-boundary — wrapAsync()', () => {
  test('calls the wrapped function normally on success', async () => {
    let called = false;
    const wrapped = wrapAsync(
      async () => {
        called = true;
      },
      () => {},
    );
    await wrapped();
    assert.ok(called);
  });

  test('calls the error handler on thrown Error', async () => {
    let captured = null;
    const wrapped = wrapAsync(
      async () => {
        throw new Error('boom');
      },
      (err) => {
        captured = err;
      },
    );
    await wrapped();
    assert.ok(captured instanceof Error);
    assert.equal(captured.message, 'boom');
  });

  test('wraps non-Error throws into Error', async () => {
    let captured = null;
    const wrapped = wrapAsync(
      async () => {
        throw 'string error'; // eslint-disable-line no-throw-literal -- intentionally testing non-Error throw wrapping
      },
      (err) => {
        captured = err;
      },
    );
    await wrapped();
    assert.ok(captured instanceof Error);
    assert.ok(captured.message.includes('string error'));
  });

  test('does not throw even when the wrapped function fails', async () => {
    const wrapped = wrapAsync(
      async () => {
        throw new Error('fail');
      },
      () => {},
    );
    await assert.doesNotReject(wrapped());
  });
});
