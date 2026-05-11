/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Task port contract for the task module.
 * @sidecar task-port.mjs.header.md
 * @layer module | @hex port | @ctx task
 * @public false
 * @edit careful
 */

/**
 * Port contract for task execution adapters.
 *
 * @typedef {'pending' | 'running' | 'completed' | 'failed' | 'cancelled'} TaskStatus
 *
 * @typedef {object} TaskProgress
 * @property {string} taskId
 * @property {number} progress - Value between 0 and 1.
 * @property {string} [message]
 *
 * @typedef {object} TaskResult
 * @property {string} taskId
 * @property {TaskStatus} status
 * @property {*} [result]
 * @property {string} [error]
 *
 * @typedef {object} TaskOptions
 * @property {number} [timeout]
 * @property {Transferable[]} [transferables]
 * @property {(p: TaskProgress) => void} [onProgress]
 *
 * @typedef {object} TaskHandle
 * @property {string} id
 * @property {() => void} cancel
 * @property {Promise<TaskResult>} result
 *
 * @typedef {object} TaskPort
 * @property {(fn: Function, options?: TaskOptions) => TaskHandle} enqueue
 * @property {(taskId: string) => void} cancel
 * @property {(taskId: string) => TaskStatus | undefined} getStatus
 * @property {(taskId: string, callback: (p: TaskProgress) => void) => void} onProgress
 * @property {(taskId: string, callback: (r: TaskResult) => void) => void} onComplete
 * @property {() => Promise<void>} drain
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the TaskPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertTaskPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('task.port.adapter_must_be_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.enqueue !== 'function') {
    throw new TypeError(t('task.port.missing_enqueue'));
  }
  if (typeof a.cancel !== 'function') {
    throw new TypeError(t('task.port.missing_cancel'));
  }
  if (typeof a.getStatus !== 'function') {
    throw new TypeError(t('task.port.missing_getStatus'));
  }
  if (typeof a.onProgress !== 'function') {
    throw new TypeError(t('task.port.missing_onProgress'));
  }
  if (typeof a.onComplete !== 'function') {
    throw new TypeError(t('task.port.missing_onComplete'));
  }
  if (typeof a.drain !== 'function') {
    throw new TypeError(t('task.port.missing_drain'));
  }
}
