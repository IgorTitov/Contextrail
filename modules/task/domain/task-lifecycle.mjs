/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Task Lifecycle domain logic for the task module.
 * @sidecar task-lifecycle.mjs.header.md
 * @layer module | @hex domain | @ctx task
 * @public false
 * @edit careful
 */

/**
 * Manages task state transitions through the lifecycle.
 *
 * Valid transitions:
 *   pending  -> running
 *   running  -> completed | failed | cancelled
 *
 * Terminal states: completed, failed, cancelled
 */

import { t } from '../messages.mjs';

/** @type {Record<string, string[]>} */
const VALID_TRANSITIONS = {
  pending: ['running'],
  running: ['completed', 'failed', 'cancelled'],
};

const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled']);

/**
 * Create a task lifecycle manager for the given task ID.
 *
 * @param {string} taskId
 * @returns {{
 *   getStatus: () => import('../ports/task-port.mjs').TaskStatus,
 *   transition: (newStatus: import('../ports/task-port.mjs').TaskStatus) => void,
 *   onTransition: (callback: (from: import('../ports/task-port.mjs').TaskStatus, to: import('../ports/task-port.mjs').TaskStatus) => void) => void,
 * }}
 */
export function createTaskLifecycle(_taskId) {
  /** @type {import('../ports/task-port.mjs').TaskStatus} */
  let status = 'pending';

  /** @type {Array<(from: string, to: string) => void>} */
  const listeners = [];

  return {
    getStatus() {
      return status;
    },

    transition(newStatus) {
      if (TERMINAL_STATES.has(status)) {
        throw new Error(t('task.lifecycle.already_terminal', { status }));
      }

      const allowed = VALID_TRANSITIONS[status];
      if (!allowed || !allowed.includes(newStatus)) {
        throw new Error(t('task.lifecycle.invalid_transition', { from: status, to: newStatus }));
      }

      const from = status;
      status = newStatus;

      for (const cb of listeners) {
        cb(from, newStatus);
      }
    },

    onTransition(callback) {
      listeners.push(callback);
    },
  };
}
