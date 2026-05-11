/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the task bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx task
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the task bounded module.
 * The only file other modules may import.
 */

// Ports
export { assertTaskPort } from './ports/task-port.mjs';

// Domain
export { createTaskLifecycle } from './domain/task-lifecycle.mjs';
export { serializeForTransfer } from './domain/serialize.mjs';

// Adapters
export { createWebWorkerAdapter } from './adapters/web-worker-adapter.mjs';
export { createMainThreadAdapter } from './adapters/main-thread-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
