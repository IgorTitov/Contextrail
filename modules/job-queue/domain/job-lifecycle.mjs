/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure job lifecycle domain — state transitions, retry/backoff, readiness.
 * @sidecar job-lifecycle.mjs.header.md
 * @layer domain | @hex _none_ | @ctx job-queue
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure domain for durable background jobs. All randomness, clocks, and I/O
 * are injected by adapters — the domain just decides *what* happens to a job
 * when it is enqueued, picked up, completed, or failed.
 *
 * A job moves through a small finite state machine:
 *
 *   pending  → running  → completed
 *                      → failed         (retries exhausted)
 *                      → pending        (retry with backoff)
 *
 * @typedef {'pending' | 'running' | 'completed' | 'failed'} JobStatus
 * @typedef {{ id: string, name: string, payload: unknown, status: JobStatus, attempts: number, maxAttempts: number, runAfter: number, createdAt: number, updatedAt: number, lastError?: string }} Job
 * @typedef {{ maxAttempts?: number, delayMs?: number }} EnqueueOptions
 */

/** @param {string} name @param {EnqueueOptions} [options] */
export function validateEnqueue(name, options) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError(t('job-queue.enqueue.invalid_name'));
  }
  if (options != null && typeof options !== 'object') {
    throw new TypeError(t('job-queue.enqueue.invalid_options'));
  }
  const { maxAttempts, delayMs } = options ?? {};
  if (maxAttempts != null && (!Number.isInteger(maxAttempts) || maxAttempts <= 0)) {
    throw new TypeError(t('job-queue.enqueue.invalid_max_attempts'));
  }
  if (delayMs != null && (typeof delayMs !== 'number' || delayMs < 0)) {
    throw new TypeError(t('job-queue.enqueue.invalid_delay'));
  }
}

/**
 * Create a fresh pending job record.
 *
 * @param {{ id: string, name: string, payload: unknown, now: number, maxAttempts?: number, delayMs?: number }} input
 * @returns {Job}
 */
export function createJob(input) {
  validateEnqueue(input.name, { maxAttempts: input.maxAttempts, delayMs: input.delayMs });
  const now = input.now;
  return {
    id: input.id,
    name: input.name,
    payload: input.payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    runAfter: now + (input.delayMs ?? 0),
    createdAt: now,
    updatedAt: now,
  };
}

/** @param {Job} job @param {number} now */
export function isReady(job, now) {
  return job.status === 'pending' && job.runAfter <= now;
}

/** @param {Job} job @param {number} now */
export function markRunning(job, now) {
  job.status = 'running';
  job.attempts += 1;
  job.updatedAt = now;
}

/** @param {Job} job @param {number} now */
export function markCompleted(job, now) {
  job.status = 'completed';
  job.updatedAt = now;
}

/**
 * Decide what happens to a failed job: retry with backoff (back to pending)
 * or give up (final failed). `computeBackoffMs` is injected so the domain
 * stays free of hardcoded timing.
 *
 * @param {Job} job
 * @param {number} now
 * @param {string} errorMessage
 * @param {(attempt: number) => number} computeBackoffMs
 * @returns {'retry' | 'dead'}
 */
export function markFailed(job, now, errorMessage, computeBackoffMs) {
  job.lastError = errorMessage;
  job.updatedAt = now;
  if (job.attempts >= job.maxAttempts) {
    job.status = 'failed';
    return 'dead';
  }
  job.status = 'pending';
  job.runAfter = now + computeBackoffMs(job.attempts);
  return 'retry';
}

/**
 * Exponential backoff with jitter-free deterministic output.
 * attempt 1 → baseMs, attempt 2 → baseMs*2, attempt 3 → baseMs*4, …
 *
 * @param {number} attempt  1-based attempt count.
 * @param {number} baseMs   Base delay in milliseconds.
 * @param {number} [capMs=60000]  Max backoff cap.
 * @returns {number}
 */
export function exponentialBackoff(attempt, baseMs, capMs = 60000) {
  if (!Number.isInteger(attempt) || attempt <= 0) {
    throw new TypeError(t('job-queue.backoff.invalid_attempt'));
  }
  if (typeof baseMs !== 'number' || baseMs <= 0) {
    throw new TypeError(t('job-queue.backoff.invalid_base'));
  }
  const exp = baseMs * 2 ** (attempt - 1);
  return Math.min(exp, capMs);
}
