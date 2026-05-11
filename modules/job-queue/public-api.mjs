/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the job-queue module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx job-queue
 * @public true
 * @edit careful
 */

// Domain
export {
  createJob,
  isReady,
  markRunning,
  markCompleted,
  markFailed,
  exponentialBackoff,
  validateEnqueue,
} from './domain/job-lifecycle.mjs';

export { createJobWorker } from './domain/worker.mjs';

// Ports
export { assertJobQueuePort } from './ports/job-queue-port.mjs';

// Adapters
export { createMemoryJobQueue } from './adapters/memory-job-queue.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
