/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Main Thread adapter for the task module.
 * @sidecar main-thread-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx task
 * @public false
 * @edit careful
 */

/**
 * Main-thread task adapter.
 * Executes tasks on the current thread using setTimeout(fn, 0) for yielding.
 * Implements the TaskPort contract without true parallelism.
 *
 * @returns {import('../ports/task-port.mjs').TaskPort}
 */

import { createTaskLifecycle } from '../domain/task-lifecycle.mjs';
import { t } from '../messages.mjs';

let nextId = 0;

/**
 * Create a main-thread task adapter.
 *
 * @returns {import('../ports/task-port.mjs').TaskPort & { destroy: () => void }}
 */
export function createMainThreadAdapter() {
  /** @type {Map<string, ReturnType<typeof createTaskLifecycle>>} */
  const lifecycles = new Map();

  /** @type {Map<string, AbortController>} */
  const controllers = new Map();

  /** @type {Map<string, (r: import('../ports/task-port.mjs').TaskResult) => void>} */
  const resolvers = new Map();

  /** @type {Map<string, number | undefined>} */
  const timeoutHandles = new Map();

  /** @type {Map<string, import('../ports/task-port.mjs').TaskOptions>} */
  const taskOptionsMap = new Map();

  /** @type {Map<string, Array<(p: import('../ports/task-port.mjs').TaskProgress) => void>>} */
  const progressListeners = new Map();

  /** @type {Map<string, Array<(r: import('../ports/task-port.mjs').TaskResult) => void>>} */
  const completeListeners = new Map();

  /** @type {Set<Promise<void>>} */
  const pending = new Set();

  /**
   * @param {string} taskId
   * @param {import('../ports/task-port.mjs').TaskProgress} progress
   */
  function emitProgress(taskId, progress) {
    const cbs = progressListeners.get(taskId);
    if (cbs) for (const cb of cbs) cb(progress);
  }

  /**
   * @param {string} taskId
   * @param {import('../ports/task-port.mjs').TaskResult} result
   */
  function emitComplete(taskId, result) {
    const cbs = completeListeners.get(taskId);
    if (cbs) for (const cb of cbs) cb(result);
  }

  /**
   * Resolve a task with the given result, clear its timeout, and emit completion.
   *
   * @param {string} taskId
   * @param {import('../ports/task-port.mjs').TaskResult} result
   */
  function settleTask(taskId, result) {
    const handle = timeoutHandles.get(taskId);
    if (handle != null) clearTimeout(handle);
    timeoutHandles.delete(taskId);

    const resolver = resolvers.get(taskId);
    if (resolver) resolver(result);
    emitComplete(taskId, result);
  }

  /**
   * Cancel a task by taskId. Works for both pending and running tasks.
   *
   * @param {string} taskId
   */
  function cancelTask(taskId) {
    const lifecycle = lifecycles.get(taskId);
    const ac = controllers.get(taskId);
    if (!lifecycle || !ac) return;

    const currentStatus = lifecycle.getStatus();
    if (currentStatus === 'pending') {
      lifecycle.transition('running');
      ac.abort();
      lifecycle.transition('cancelled');
      settleTask(taskId, {
        taskId,
        status: 'cancelled',
        error: t('task.cancelled', { taskId }),
      });
    } else if (currentStatus === 'running') {
      ac.abort();
      lifecycle.transition('cancelled');
      settleTask(taskId, {
        taskId,
        status: 'cancelled',
        error: t('task.cancelled', { taskId }),
      });
    }
    // If already terminal, cancel is a no-op.
  }

  return {
    enqueue(fn, options = {}) {
      const taskId = `task-${++nextId}`;
      const lifecycle = createTaskLifecycle(taskId);
      lifecycles.set(taskId, lifecycle);
      taskOptionsMap.set(taskId, options);

      const ac = new AbortController();
      controllers.set(taskId, ac);

      /** @type {(r: import('../ports/task-port.mjs').TaskResult) => void} */
      let resolveResult;
      /** @type {Promise<import('../ports/task-port.mjs').TaskResult>} */
      const resultPromise = new Promise((resolve) => {
        resolveResult = resolve;
      });
      resolvers.set(taskId, resolveResult);

      const execution = new Promise((resolve) => {
        setTimeout(() => {
          // If already cancelled before execution starts, bail out.
          if (ac.signal.aborted) {
            resolve(undefined);
            return;
          }

          lifecycle.transition('running');

          /** @param {number} progress @param {string} [message] */
          const reportProgress = (progress, message) => {
            emitProgress(taskId, { taskId, progress, message });
            if (options.onProgress) {
              options.onProgress({ taskId, progress, message });
            }
          };

          if (options.timeout && options.timeout > 0) {
            const th = setTimeout(() => {
              if (lifecycle.getStatus() === 'running') {
                ac.abort();
                lifecycle.transition('failed');
                settleTask(taskId, {
                  taskId,
                  status: 'failed',
                  error: t('task.timeout', { taskId, timeout: options.timeout }),
                });
              }
            }, options.timeout);
            timeoutHandles.set(taskId, /** @type {number} */ (th));
          }

          Promise.resolve()
            .then(() => fn({ signal: ac.signal, reportProgress }))
            .then((value) => {
              if (lifecycle.getStatus() !== 'running') return;
              lifecycle.transition('completed');
              settleTask(taskId, { taskId, status: 'completed', result: value });
            })
            .catch((err) => {
              if (lifecycle.getStatus() !== 'running') return;
              lifecycle.transition('failed');
              settleTask(taskId, { taskId, status: 'failed', error: String(err) });
            })
            .finally(() => resolve(undefined));
        }, 0);
      });

      pending.add(execution);
      execution.finally(() => pending.delete(execution));

      return {
        id: taskId,
        cancel: () => cancelTask(taskId),
        result: resultPromise,
      };
    },

    cancel(taskId) {
      cancelTask(taskId);
    },

    getStatus(taskId) {
      const lifecycle = lifecycles.get(taskId);
      return lifecycle?.getStatus();
    },

    onProgress(taskId, callback) {
      if (!progressListeners.has(taskId)) progressListeners.set(taskId, []);
      progressListeners.get(taskId).push(callback);
    },

    onComplete(taskId, callback) {
      if (!completeListeners.has(taskId)) completeListeners.set(taskId, []);
      completeListeners.get(taskId).push(callback);
    },

    async drain() {
      while (pending.size > 0) {
        await Promise.all([...pending]);
      }
    },

    destroy() {
      for (const ac of controllers.values()) {
        ac.abort();
      }
      lifecycles.clear();
      controllers.clear();
      resolvers.clear();
      timeoutHandles.clear();
      taskOptionsMap.clear();
      progressListeners.clear();
      completeListeners.clear();
      pending.clear();
    },
  };
}
