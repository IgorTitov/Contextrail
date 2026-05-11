/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory durable-style job queue with retry/backoff and dead-letter.
 * @sidecar memory-job-queue.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx job-queue
 * @public false
 * @edit careful
 */

import {
  createJob,
  isReady,
  markRunning,
  markCompleted,
  markFailed,
  exponentialBackoff,
} from '../domain/job-lifecycle.mjs';
import { t } from '../messages.mjs';

/**
 * In-memory job queue adapter. Stores jobs in a Map, picks the next ready
 * job in FIFO order (by createdAt), and retries failed jobs with the
 * injected backoff function. Ideal for tests, single-process servers, and
 * as the default when no external broker is configured. A sqlite, redis,
 * or postgres adapter can plug in behind the same `JobQueuePort` later.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]        Clock function (defaults to Date.now).
 * @param {() => string} [options.idFactory]  Id generator (defaults to job-N counter).
 * @param {(attempt: number) => number} [options.backoffMs]  Retry backoff; defaults to exponentialBackoff(attempt, 100, 60000).
 * @returns {import('../ports/job-queue-port.mjs').JobQueuePort}
 */
export function createMemoryJobQueue(options = {}) {
  const clock = options.now ?? Date.now;
  let counter = 0;
  const idFactory = options.idFactory ?? (() => `job-${++counter}`);
  const backoffMs = options.backoffMs ?? ((attempt) => exponentialBackoff(attempt, 100, 60000));

  /** @type {Map<string, import('../domain/job-lifecycle.mjs').Job>} */
  const jobs = new Map();

  return {
    enqueue(name, payload, opts) {
      const job = createJob({
        id: idFactory(),
        name,
        payload,
        now: clock(),
        maxAttempts: opts?.maxAttempts,
        delayMs: opts?.delayMs,
      });
      jobs.set(job.id, job);
      return job;
    },

    dequeue() {
      const now = clock();
      /** @type {import('../domain/job-lifecycle.mjs').Job | null} */
      let next = null;
      for (const job of jobs.values()) {
        if (isReady(job, now)) {
          if (!next || job.createdAt < next.createdAt) {
            next = job;
          }
        }
      }
      if (!next) return null;
      markRunning(next, now);
      return next;
    },

    complete(id) {
      const job = jobs.get(id);
      if (!job) {
        throw new Error(t('job-queue.complete.unknown_job', { id }));
      }
      markCompleted(job, clock());
    },

    fail(id, errorMessage) {
      const job = jobs.get(id);
      if (!job) {
        throw new Error(t('job-queue.fail.unknown_job', { id }));
      }
      return markFailed(job, clock(), String(errorMessage), backoffMs);
    },

    list(status) {
      const out = [];
      for (const job of jobs.values()) {
        if (!status || job.status === status) out.push(job);
      }
      return out;
    },

    size(status) {
      if (!status) return jobs.size;
      let count = 0;
      for (const job of jobs.values()) {
        if (job.status === status) count += 1;
      }
      return count;
    },
  };
}
