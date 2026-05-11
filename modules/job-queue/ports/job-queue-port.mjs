/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for job-queue adapters.
 * @sidecar job-queue-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx job-queue
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for durable background job queues.
 *
 * Adapters own storage (memory, sqlite, redis, postgres LISTEN/NOTIFY, …)
 * and must expose the contract below. The worker loop in `worker.mjs` is
 * framework-free and drives any adapter through this port.
 *
 * @typedef {import('../domain/job-lifecycle.mjs').Job} Job
 * @typedef {import('../domain/job-lifecycle.mjs').JobStatus} JobStatus
 * @typedef {import('../domain/job-lifecycle.mjs').EnqueueOptions} EnqueueOptions
 *
 * @typedef {object} JobQueuePort
 * @property {(name: string, payload: unknown, options?: EnqueueOptions) => Job} enqueue  Enqueue a new job and return it.
 * @property {() => Job | null} dequeue                                                   Atomically claim the next ready job (→ running) or null.
 * @property {(id: string) => void} complete                                              Mark a running job as completed.
 * @property {(id: string, error: string) => 'retry' | 'dead'} fail                        Fail a running job — adapter decides retry vs dead-letter.
 * @property {(status?: JobStatus) => Job[]} list                                          Snapshot of jobs, optionally filtered by status.
 * @property {(status?: JobStatus) => number} size                                         Count of jobs, optionally filtered by status.
 */

const REQUIRED = [
  ['enqueue', 'job-queue.port.missing_enqueue'],
  ['dequeue', 'job-queue.port.missing_dequeue'],
  ['complete', 'job-queue.port.missing_complete'],
  ['fail', 'job-queue.port.missing_fail'],
  ['list', 'job-queue.port.missing_list'],
  ['size', 'job-queue.port.missing_size'],
];

/**
 * Validate that an adapter conforms to the JobQueuePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertJobQueuePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('job-queue.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
