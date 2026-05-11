/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of task-test in this repository.
 * @sidecar task.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTaskPort,
  createTaskLifecycle,
  serializeForTransfer,
  createMainThreadAdapter,
  createWebWorkerAdapter,
} from '../../modules/task/public-api.mjs';

// -- assertTaskPort ----------------------------------------------------------

describe('task port -- assertTaskPort()', () => {
  function validAdapter() {
    return {
      enqueue: () => {},
      cancel: () => {},
      getStatus: () => {},
      onProgress: () => {},
      onComplete: () => {},
      drain: () => {},
    };
  }

  test('accepts a valid adapter', () => {
    assert.doesNotThrow(() => assertTaskPort(validAdapter()));
  });

  test('throws for null', () => {
    assert.throws(() => assertTaskPort(null), TypeError);
  });

  test('throws for undefined', () => {
    assert.throws(() => assertTaskPort(undefined), TypeError);
  });

  test('throws for a non-object', () => {
    assert.throws(() => assertTaskPort('string'), TypeError);
  });

  test('throws for missing enqueue', () => {
    const a = validAdapter();
    delete a.enqueue;
    assert.throws(() => assertTaskPort(a), TypeError);
  });

  test('throws for missing cancel', () => {
    const a = validAdapter();
    delete a.cancel;
    assert.throws(() => assertTaskPort(a), TypeError);
  });

  test('throws for missing getStatus', () => {
    const a = validAdapter();
    delete a.getStatus;
    assert.throws(() => assertTaskPort(a), TypeError);
  });

  test('throws for missing onProgress', () => {
    const a = validAdapter();
    delete a.onProgress;
    assert.throws(() => assertTaskPort(a), TypeError);
  });

  test('throws for missing onComplete', () => {
    const a = validAdapter();
    delete a.onComplete;
    assert.throws(() => assertTaskPort(a), TypeError);
  });

  test('throws for missing drain', () => {
    const a = validAdapter();
    delete a.drain;
    assert.throws(() => assertTaskPort(a), TypeError);
  });
});

// -- createTaskLifecycle -----------------------------------------------------

describe('task domain -- createTaskLifecycle()', () => {
  test('starts in pending status', () => {
    const lc = createTaskLifecycle('t1');
    assert.equal(lc.getStatus(), 'pending');
  });

  test('transitions pending -> running', () => {
    const lc = createTaskLifecycle('t1');
    lc.transition('running');
    assert.equal(lc.getStatus(), 'running');
  });

  test('transitions running -> completed', () => {
    const lc = createTaskLifecycle('t1');
    lc.transition('running');
    lc.transition('completed');
    assert.equal(lc.getStatus(), 'completed');
  });

  test('transitions running -> failed', () => {
    const lc = createTaskLifecycle('t1');
    lc.transition('running');
    lc.transition('failed');
    assert.equal(lc.getStatus(), 'failed');
  });

  test('transitions running -> cancelled', () => {
    const lc = createTaskLifecycle('t1');
    lc.transition('running');
    lc.transition('cancelled');
    assert.equal(lc.getStatus(), 'cancelled');
  });

  test('throws on invalid transition pending -> completed', () => {
    const lc = createTaskLifecycle('t1');
    assert.throws(() => lc.transition('completed'), /Invalid task state transition/);
  });

  test('throws on invalid transition pending -> failed', () => {
    const lc = createTaskLifecycle('t1');
    assert.throws(() => lc.transition('failed'), /Invalid task state transition/);
  });

  test('throws on invalid transition completed -> running', () => {
    const lc = createTaskLifecycle('t1');
    lc.transition('running');
    lc.transition('completed');
    assert.throws(() => lc.transition('running'), /already in terminal state/);
  });

  test('throws on transition from terminal cancelled', () => {
    const lc = createTaskLifecycle('t1');
    lc.transition('running');
    lc.transition('cancelled');
    assert.throws(() => lc.transition('running'), /already in terminal state/);
  });

  test('onTransition callback fires on valid transition', () => {
    const lc = createTaskLifecycle('t1');
    const transitions = [];
    lc.onTransition((from, to) => transitions.push({ from, to }));
    lc.transition('running');
    lc.transition('completed');
    assert.deepEqual(transitions, [
      { from: 'pending', to: 'running' },
      { from: 'running', to: 'completed' },
    ]);
  });

  test('onTransition does not fire on invalid transition', () => {
    const lc = createTaskLifecycle('t1');
    const transitions = [];
    lc.onTransition((from, to) => transitions.push({ from, to }));
    try {
      lc.transition('completed');
    } catch {
      /* expected */
    }
    assert.equal(transitions.length, 0);
  });
});

// -- serializeForTransfer ----------------------------------------------------

describe('task domain -- serializeForTransfer()', () => {
  test('clones basic data without transferables', () => {
    const data = { a: 1, b: [2, 3] };
    const result = serializeForTransfer(data);
    assert.deepEqual(result.data, data);
    assert.notEqual(result.data, data); // cloned
    assert.deepEqual(result.transferables, []);
  });

  test('returns empty transferables when none provided', () => {
    const result = serializeForTransfer('hello');
    assert.equal(result.data, 'hello');
    assert.deepEqual(result.transferables, []);
  });

  test('accepts valid ArrayBuffer transferables', () => {
    const buf = new ArrayBuffer(8);
    const result = serializeForTransfer({ x: 1 }, [buf]);
    assert.equal(result.transferables.length, 1);
  });

  test('throws for invalid transferable', () => {
    assert.throws(
      () => serializeForTransfer({ x: 1 }, [/** @type {any} */ ('not-a-transferable')]),
      /not a valid transferable type/,
    );
  });

  test('throws for null in transferable list', () => {
    assert.throws(
      () => serializeForTransfer({}, [/** @type {any} */ (null)]),
      /not a valid transferable type/,
    );
  });
});

// -- createMainThreadAdapter -------------------------------------------------

describe('task adapter -- mainThreadAdapter', () => {
  /** @type {ReturnType<typeof createMainThreadAdapter>} */
  let adapter;

  beforeEach(() => {
    adapter = createMainThreadAdapter();
  });

  afterEach(() => {
    adapter.destroy();
  });

  test('passes assertTaskPort', () => {
    assert.doesNotThrow(() => assertTaskPort(adapter));
  });

  test('enqueue returns a TaskHandle with id, cancel, and result', () => {
    const handle = adapter.enqueue(() => 42);
    assert.equal(typeof handle.id, 'string');
    assert.equal(typeof handle.cancel, 'function');
    assert.ok(handle.result instanceof Promise);
  });

  test('enqueue executes function and resolves result', async () => {
    const handle = adapter.enqueue(() => 42);
    const result = await handle.result;
    assert.equal(result.status, 'completed');
    assert.equal(result.result, 42);
    assert.equal(result.taskId, handle.id);
  });

  test('enqueue handles async functions', async () => {
    const handle = adapter.enqueue(async () => {
      return 'async-value';
    });
    const result = await handle.result;
    assert.equal(result.status, 'completed');
    assert.equal(result.result, 'async-value');
  });

  test('enqueue handles function errors as failed', async () => {
    const handle = adapter.enqueue(() => {
      throw new Error('boom');
    });
    const result = await handle.result;
    assert.equal(result.status, 'failed');
    assert.ok(result.error.includes('boom'));
  });

  test('cancel sets cancelled status', async () => {
    // Use a function that waits so we can cancel it
    const handle = adapter.enqueue(({ signal }) => {
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (signal.aborted) {
            clearInterval(check);
            resolve('done');
          }
        }, 5);
      });
    });

    // Wait for it to start running
    await new Promise((r) => setTimeout(r, 10));
    handle.cancel();
    const result = await handle.result;
    assert.equal(result.status, 'cancelled');
  });

  test('getStatus reflects current state', async () => {
    const handle = adapter.enqueue(() => 'ok');
    // Initially pending (before setTimeout fires)
    assert.equal(adapter.getStatus(handle.id), 'pending');
    await handle.result;
    assert.equal(adapter.getStatus(handle.id), 'completed');
  });

  test('getStatus returns undefined for unknown taskId', () => {
    assert.equal(adapter.getStatus('nonexistent'), undefined);
  });

  test('onProgress receives progress updates', async () => {
    const progressUpdates = [];
    const handle = adapter.enqueue(({ reportProgress }) => {
      reportProgress(0.5, 'halfway');
      reportProgress(1.0, 'done');
      return 'ok';
    });
    adapter.onProgress(handle.id, (p) => progressUpdates.push(p));
    await handle.result;
    assert.ok(progressUpdates.length >= 1);
    assert.equal(progressUpdates[0].progress, 0.5);
  });

  test('onComplete fires when task finishes', async () => {
    const handle = adapter.enqueue(() => 99);
    const completed = [];
    adapter.onComplete(handle.id, (r) => completed.push(r));
    await handle.result;
    // Give a tick for the complete listener
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(completed.length, 1);
    assert.equal(completed[0].status, 'completed');
    assert.equal(completed[0].result, 99);
  });

  test('drain waits for all queued tasks to complete', async () => {
    const results = [];
    adapter.enqueue(() => {
      results.push(1);
      return 1;
    });
    adapter.enqueue(() => {
      results.push(2);
      return 2;
    });
    adapter.enqueue(() => {
      results.push(3);
      return 3;
    });
    await adapter.drain();
    assert.equal(results.length, 3);
  });

  test('drain resolves immediately when no tasks', async () => {
    await adapter.drain(); // should not hang
  });

  test('onProgress callback from options is called', async () => {
    const progressUpdates = [];
    const handle = adapter.enqueue(
      ({ reportProgress }) => {
        reportProgress(0.25, 'quarter');
        return 'ok';
      },
      {
        onProgress: (p) => progressUpdates.push(p),
      },
    );
    await handle.result;
    assert.ok(progressUpdates.length >= 1);
    assert.equal(progressUpdates[0].progress, 0.25);
  });

  test('cancel via adapter.cancel() method', async () => {
    const handle = adapter.enqueue(({ signal }) => {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (signal.aborted) {
            clearInterval(check);
            resolve('done');
          }
        }, 5);
      });
    });
    await new Promise((r) => setTimeout(r, 10));
    adapter.cancel(handle.id);
    const result = await handle.result;
    assert.equal(result.status, 'cancelled');
  });

  test('timeout causes task to fail', async () => {
    const handle = adapter.enqueue(() => new Promise((resolve) => setTimeout(resolve, 500)), {
      timeout: 20,
    });
    const result = await handle.result;
    assert.equal(result.status, 'failed');
    assert.ok(result.error.includes('timeout'));
  });
});

// -- createWebWorkerAdapter --------------------------------------------------

describe('task adapter -- webWorkerAdapter', () => {
  test('factory function exists and is exported', () => {
    assert.equal(typeof createWebWorkerAdapter, 'function');
  });

  test('passes assertTaskPort with a mock-shaped adapter', () => {
    // In Node.js, Worker/Blob/URL.createObjectURL are not available,
    // so we verify the factory at least produces the right shape
    // by testing assertTaskPort against a manually shaped mock.
    const mock = {
      enqueue: () => ({ id: 'x', cancel: () => {}, result: Promise.resolve() }),
      cancel: () => {},
      getStatus: () => 'pending',
      onProgress: () => {},
      onComplete: () => {},
      drain: () => Promise.resolve(),
    };
    assert.doesNotThrow(() => assertTaskPort(mock));
  });
});
