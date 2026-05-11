/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the job-queue bounded module — lifecycle, retry/backoff, worker loop.
 * @sidecar job-queue.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createJob,
  isReady,
  markRunning,
  markCompleted,
  markFailed,
  exponentialBackoff,
  validateEnqueue,
  assertJobQueuePort,
  createMemoryJobQueue,
  createJobWorker,
} from '../../modules/job-queue/public-api.mjs';

describe('job-queue domain — lifecycle', () => {
  test('createJob returns a pending job with default maxAttempts=3 and no delay', () => {
    const job = createJob({ id: 'j1', name: 'email', payload: { to: 'a' }, now: 1000 });
    assert.equal(job.id, 'j1');
    assert.equal(job.name, 'email');
    assert.deepEqual(job.payload, { to: 'a' });
    assert.equal(job.status, 'pending');
    assert.equal(job.attempts, 0);
    assert.equal(job.maxAttempts, 3);
    assert.equal(job.runAfter, 1000);
    assert.equal(job.createdAt, 1000);
  });

  test('createJob honors maxAttempts and delayMs', () => {
    const job = createJob({
      id: 'j2',
      name: 'webhook',
      payload: null,
      now: 500,
      maxAttempts: 5,
      delayMs: 2000,
    });
    assert.equal(job.maxAttempts, 5);
    assert.equal(job.runAfter, 2500);
  });

  test('isReady is false while runAfter is in the future', () => {
    const job = createJob({ id: 'j', name: 'x', payload: null, now: 0, delayMs: 1000 });
    assert.equal(isReady(job, 500), false);
    assert.equal(isReady(job, 1000), true);
  });

  test('markRunning increments attempts and flips status', () => {
    const job = createJob({ id: 'j', name: 'x', payload: null, now: 0 });
    markRunning(job, 10);
    assert.equal(job.status, 'running');
    assert.equal(job.attempts, 1);
  });

  test('markCompleted flips status to completed', () => {
    const job = createJob({ id: 'j', name: 'x', payload: null, now: 0 });
    markRunning(job, 1);
    markCompleted(job, 2);
    assert.equal(job.status, 'completed');
  });

  test('markFailed retries when attempts < maxAttempts', () => {
    const job = createJob({ id: 'j', name: 'x', payload: null, now: 0, maxAttempts: 3 });
    markRunning(job, 1);
    const outcome = markFailed(job, 2, 'boom', () => 50);
    assert.equal(outcome, 'retry');
    assert.equal(job.status, 'pending');
    assert.equal(job.runAfter, 52);
    assert.equal(job.lastError, 'boom');
  });

  test('markFailed dead-letters when attempts >= maxAttempts', () => {
    const job = createJob({ id: 'j', name: 'x', payload: null, now: 0, maxAttempts: 2 });
    markRunning(job, 1); // attempts=1
    markFailed(job, 2, 'fail1', () => 10);
    markRunning(job, 20); // attempts=2
    const outcome = markFailed(job, 21, 'fail2', () => 10);
    assert.equal(outcome, 'dead');
    assert.equal(job.status, 'failed');
  });

  test('validateEnqueue rejects bad inputs', () => {
    assert.throws(() => validateEnqueue(''), /non-empty string/);
    assert.throws(() => validateEnqueue('x', 'bad'), /must be an object/);
    assert.throws(() => validateEnqueue('x', { maxAttempts: 0 }), /positive integer/);
    assert.throws(() => validateEnqueue('x', { maxAttempts: 1.5 }), /positive integer/);
    assert.throws(() => validateEnqueue('x', { delayMs: -1 }), /non-negative/);
  });
});

describe('job-queue domain — exponentialBackoff', () => {
  test('doubles per attempt starting from baseMs', () => {
    assert.equal(exponentialBackoff(1, 100), 100);
    assert.equal(exponentialBackoff(2, 100), 200);
    assert.equal(exponentialBackoff(3, 100), 400);
    assert.equal(exponentialBackoff(4, 100), 800);
  });

  test('honors cap', () => {
    assert.equal(exponentialBackoff(20, 100, 5000), 5000);
  });

  test('rejects invalid inputs', () => {
    assert.throws(() => exponentialBackoff(0, 100), /attempt/);
    assert.throws(() => exponentialBackoff(1.5, 100), /attempt/);
    assert.throws(() => exponentialBackoff(1, 0), /baseMs/);
  });
});

describe('job-queue — assertJobQueuePort', () => {
  test('throws on non-object', () => {
    assert.throws(() => assertJobQueuePort(null), /non-null object/);
    assert.throws(() => assertJobQueuePort('nope'), /non-null object/);
  });

  test('throws when a required method is missing', () => {
    const full = {
      enqueue: () => {},
      dequeue: () => {},
      complete: () => {},
      fail: () => {},
      list: () => {},
      size: () => {},
    };
    for (const m of Object.keys(full)) {
      const missing = { ...full };
      delete missing[m];
      assert.throws(() => assertJobQueuePort(missing), new RegExp(m));
    }
  });

  test('accepts a conforming adapter', () => {
    assert.doesNotThrow(() => assertJobQueuePort(createMemoryJobQueue()));
  });
});

describe('job-queue — memory adapter', () => {
  test('enqueue returns a pending job and size() reflects it', () => {
    const now = 0;
    const q = createMemoryJobQueue({ now: () => now });
    const job = q.enqueue('email', { to: 'a' });
    assert.equal(job.status, 'pending');
    assert.equal(q.size(), 1);
    assert.equal(q.size('pending'), 1);
    assert.equal(q.size('completed'), 0);
  });

  test('dequeue picks the oldest ready job FIFO by createdAt', () => {
    let now = 0;
    const q = createMemoryJobQueue({ now: () => now });
    const a = q.enqueue('a', null);
    now = 5;
    const b = q.enqueue('b', null);
    now = 10;
    const picked = q.dequeue();
    assert.equal(picked.id, a.id);
    assert.equal(picked.status, 'running');
    assert.equal(picked.attempts, 1);
    assert.equal(b.status, 'pending'); // untouched
  });

  test('dequeue returns null when nothing is ready', () => {
    let now = 0;
    const q = createMemoryJobQueue({ now: () => now });
    q.enqueue('x', null, { delayMs: 1000 });
    assert.equal(q.dequeue(), null);
    now = 1000;
    assert.ok(q.dequeue());
  });

  test('complete marks job as completed', () => {
    const q = createMemoryJobQueue();
    const j = q.enqueue('x', null);
    q.dequeue();
    q.complete(j.id);
    assert.equal(q.size('completed'), 1);
  });

  test('complete on unknown id throws', () => {
    const q = createMemoryJobQueue();
    assert.throws(() => q.complete('nope'), /unknown job/);
  });

  test('fail with retries left re-queues with backoff and preserves lastError', () => {
    let now = 0;
    const q = createMemoryJobQueue({
      now: () => now,
      backoffMs: (attempt) => attempt * 10,
    });
    const j = q.enqueue('flaky', null, { maxAttempts: 3 });
    q.dequeue();
    now = 5;
    const outcome = q.fail(j.id, 'boom');
    assert.equal(outcome, 'retry');
    const [snapshot] = q.list('pending');
    assert.equal(snapshot.lastError, 'boom');
    assert.equal(snapshot.runAfter, 15); // now(5) + backoff(1*10)
    // Not ready yet at now=5
    assert.equal(q.dequeue(), null);
    now = 15;
    assert.ok(q.dequeue());
  });

  test('fail after maxAttempts dead-letters the job', () => {
    const now = 0;
    const q = createMemoryJobQueue({
      now: () => now,
      backoffMs: () => 0,
    });
    const j = q.enqueue('flaky', null, { maxAttempts: 2 });
    q.dequeue();
    q.fail(j.id, 'e1');
    q.dequeue();
    const outcome = q.fail(j.id, 'e2');
    assert.equal(outcome, 'dead');
    assert.equal(q.size('failed'), 1);
    assert.equal(q.size('pending'), 0);
  });

  test('list filters by status', () => {
    const q = createMemoryJobQueue();
    const a = q.enqueue('a', null);
    q.enqueue('b', null);
    q.dequeue(); // picks a → running
    q.complete(a.id);
    assert.equal(q.list('pending').length, 1);
    assert.equal(q.list('completed').length, 1);
    assert.equal(q.list().length, 2);
  });
});

describe('job-queue — worker loop', () => {
  test('createJobWorker rejects invalid config', () => {
    assert.throws(() => createJobWorker(null), /config/);
    assert.throws(() => createJobWorker({ queue: {}, handlers: {} }), /handlers/);
    assert.throws(() => createJobWorker({ queue: {}, handlers: { a: 'nope' } }), /handlers/);
  });

  test('runOnce processes one job and calls the matching handler', async () => {
    const q = createMemoryJobQueue();
    const calls = [];
    q.enqueue('email', { to: 'a' });
    const worker = createJobWorker({
      queue: q,
      handlers: {
        email: async (payload) => {
          calls.push(payload);
        },
      },
    });
    const processed = await worker.runOnce();
    assert.equal(processed, true);
    assert.deepEqual(calls, [{ to: 'a' }]);
    assert.equal(q.size('completed'), 1);
  });

  test('runOnce returns false when nothing is ready', async () => {
    const q = createMemoryJobQueue();
    const worker = createJobWorker({ queue: q, handlers: { x: () => {} } });
    assert.equal(await worker.runOnce(), false);
  });

  test('runUntilEmpty drains all ready jobs and returns count', async () => {
    const q = createMemoryJobQueue();
    q.enqueue('x', 1);
    q.enqueue('x', 2);
    q.enqueue('x', 3);
    const seen = [];
    const worker = createJobWorker({
      queue: q,
      handlers: {
        x: (p) => {
          seen.push(p);
        },
      },
    });
    const count = await worker.runUntilEmpty();
    assert.equal(count, 3);
    assert.deepEqual(seen, [1, 2, 3]);
    assert.equal(q.size('completed'), 3);
  });

  test('thrown handler errors become queue.fail + emit retry or dead events', async () => {
    const now = 0;
    const q = createMemoryJobQueue({ now: () => now, backoffMs: () => 0 });
    q.enqueue('boom', null, { maxAttempts: 2 });
    const events = [];
    const worker = createJobWorker({
      queue: q,
      handlers: {
        boom: () => {
          throw new Error('kaput');
        },
      },
      onEvent: (e) => events.push({ type: e.type, error: e.error }),
    });
    await worker.runOnce();
    assert.equal(events[0].type, 'retry');
    assert.equal(events[0].error, 'kaput');
    await worker.runOnce();
    assert.equal(events[1].type, 'dead');
    assert.equal(q.size('failed'), 1);
  });

  test('unknown job name is routed through queue.fail', async () => {
    const q = createMemoryJobQueue({ backoffMs: () => 0 });
    q.enqueue('ghost', null, { maxAttempts: 1 });
    const events = [];
    const worker = createJobWorker({
      queue: q,
      handlers: { other: () => {} },
      onEvent: (e) => events.push(e.type),
    });
    await worker.runOnce();
    assert.equal(events[0], 'dead');
    assert.equal(q.size('failed'), 1);
  });

  test('completed event fires on success', async () => {
    const q = createMemoryJobQueue();
    q.enqueue('ok', null);
    const events = [];
    const worker = createJobWorker({
      queue: q,
      handlers: { ok: () => 42 },
      onEvent: (e) => events.push(e.type),
    });
    await worker.runOnce();
    assert.deepEqual(events, ['completed']);
  });
});
