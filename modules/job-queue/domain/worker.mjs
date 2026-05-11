/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Framework-free worker loop that drives any JobQueuePort with handler functions.
 * @sidecar worker.mjs.header.md
 * @layer domain | @hex _none_ | @ctx job-queue
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Build a worker that processes jobs from a `JobQueuePort`. Handlers are a
 * plain `{ jobName: fn }` map. The worker is fully pull-based — the host
 * decides *when* to tick (setInterval, cron, manual for tests). `runOnce`
 * drains all currently-ready jobs; `runUntilEmpty` keeps ticking until no
 * ready job remains.
 *
 * Handlers can be sync or async. Any thrown error (or rejected promise) is
 * captured, stringified, and handed to `queue.fail(id, message)` — the
 * adapter then decides retry vs dead-letter via the injected backoff.
 *
 * @typedef {(payload: unknown, context: { job: import('./job-lifecycle.mjs').Job }) => unknown | Promise<unknown>} JobHandler
 *
 * @param {object} config
 * @param {import('../ports/job-queue-port.mjs').JobQueuePort} config.queue
 * @param {Record<string, JobHandler>} config.handlers
 * @param {(event: { type: 'completed' | 'failed' | 'retry' | 'dead', job: import('./job-lifecycle.mjs').Job, error?: string }) => void} [config.onEvent]
 * @returns {{ runOnce: () => Promise<boolean>, runUntilEmpty: () => Promise<number> }}
 */
export function createJobWorker(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError(t('job-queue.worker.invalid_config'));
  }
  const { queue, handlers, onEvent } = config;
  if (!handlers || typeof handlers !== 'object' || Object.keys(handlers).length === 0) {
    throw new TypeError(t('job-queue.worker.invalid_handlers'));
  }
  for (const fn of Object.values(handlers)) {
    if (typeof fn !== 'function') {
      throw new TypeError(t('job-queue.worker.invalid_handlers'));
    }
  }

  async function processOne() {
    const job = queue.dequeue();
    if (!job) return false;
    const handler = handlers[job.name];
    if (typeof handler !== 'function') {
      const msg = t('job-queue.worker.unknown_handler', { name: job.name });
      const outcome = queue.fail(job.id, msg);
      onEvent?.({ type: outcome === 'dead' ? 'dead' : 'retry', job, error: msg });
      return true;
    }
    try {
      await handler(job.payload, { job });
      queue.complete(job.id);
      onEvent?.({ type: 'completed', job });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const outcome = queue.fail(job.id, msg);
      onEvent?.({ type: outcome === 'dead' ? 'dead' : 'retry', job, error: msg });
    }
    return true;
  }

  return {
    async runOnce() {
      return processOne();
    },
    async runUntilEmpty() {
      let processed = 0;
      while (await processOne()) {
        processed += 1;
      }
      return processed;
    },
  };
}
