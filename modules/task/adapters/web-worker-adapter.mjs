/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Web Worker adapter for the task module.
 * @sidecar web-worker-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx task
 * @public false
 * @edit careful
 */

/**
 * Web Worker pool task adapter.
 * Manages a pool of Web Workers for parallel task execution.
 * Implements the TaskPort contract.
 *
 * Browser-only: requires the Web Worker API (globalThis.Worker).
 */

import { createTaskLifecycle } from '../domain/task-lifecycle.mjs';
import { t } from '../messages.mjs';

let nextId = 0;

/**
 * Create the inline worker script source.
 * The worker listens for task messages, executes the function, and posts
 * progress/completion/error messages back.
 *
 * @returns {string}
 */
function buildWorkerSource() {
  return `
    self.onmessage = async function(e) {
      const { taskId, fnSource, args } = e.data;
      try {
        // SECURITY: fnSource is deserialized into executable code. Callers must
        // ensure fnSource originates from application code, never from untrusted
        // user input. Passing user-controlled strings here is a code-injection vector.
        const fn = new Function('return ' + fnSource)();
        const reportProgress = (progress, message) => {
          self.postMessage({ type: 'progress', taskId, progress, message });
        };
        const result = await fn({ signal: null, reportProgress });
        self.postMessage({ type: 'complete', taskId, result });
      } catch (err) {
        self.postMessage({ type: 'error', taskId, error: String(err) });
      }
    };
  `;
}

/**
 * @typedef {object} WebWorkerAdapterOptions
 * @property {number} [poolSize] - Number of workers. Defaults to navigator.hardwareConcurrency || 4.
 */

/**
 * Create a web worker pool adapter.
 *
 * @param {WebWorkerAdapterOptions} [options]
 * @returns {import('../ports/task-port.mjs').TaskPort & { destroy: () => void }}
 */
export function createWebWorkerAdapter(options = {}) {
  const poolSize =
    options.poolSize || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4;

  /** @type {Map<string, ReturnType<typeof createTaskLifecycle>>} */
  const lifecycles = new Map();

  /** @type {Map<string, Array<(p: import('../ports/task-port.mjs').TaskProgress) => void>>} */
  const progressListeners = new Map();

  /** @type {Map<string, Array<(r: import('../ports/task-port.mjs').TaskResult) => void>>} */
  const completeListeners = new Map();

  /** @type {Map<string, (r: import('../ports/task-port.mjs').TaskResult) => void>} */
  const resolvers = new Map();

  /** @type {Map<string, number>} */
  const timeoutHandles = new Map();

  /** @type {Map<string, import('../ports/task-port.mjs').TaskOptions>} */
  const taskOptions = new Map();

  /**
   * @param {string} taskId
   * @param {import('../ports/task-port.mjs').TaskProgress} progress
   */
  function emitProgress(taskId, progress) {
    const cbs = progressListeners.get(taskId);
    if (cbs) for (const cb of cbs) cb(progress);
    const opts = taskOptions.get(taskId);
    if (opts?.onProgress) opts.onProgress(progress);
  }

  /**
   * @param {string} taskId
   * @param {import('../ports/task-port.mjs').TaskResult} result
   */
  function emitComplete(taskId, result) {
    const cbs = completeListeners.get(taskId);
    if (cbs) for (const cb of cbs) cb(result);
  }

  // Worker pool
  const workerSource = buildWorkerSource();
  const blob =
    typeof Blob !== 'undefined'
      ? new Blob([workerSource], { type: 'application/javascript' })
      : null;
  const blobUrl = blob && typeof URL !== 'undefined' ? URL.createObjectURL(blob) : null;

  /** @type {Worker[]} */
  const workers = [];

  /** @type {Set<number>} */
  const idleWorkers = new Set();

  /** @type {Map<number, string>} */
  const workerTaskMap = new Map();

  /**
   * @typedef {{ taskId: string, fn: Function, options: import('../ports/task-port.mjs').TaskOptions }} QueuedTask
   * @type {QueuedTask[]}
   */
  const queue = [];

  /** @type {Set<Promise<void>>} */
  const pendingTasks = new Set();

  /**
   * Create a new worker and add it to the pool.
   * @param {number} index
   */
  function createWorker(index) {
    if (!blobUrl) return;
    const worker = new Worker(blobUrl);
    workers[index] = worker;
    idleWorkers.add(index);

    worker.onmessage = (e) => {
      const { type, taskId, progress, message, result, error } = e.data;
      const lifecycle = lifecycles.get(taskId);
      if (!lifecycle) return;

      if (type === 'progress') {
        emitProgress(taskId, { taskId, progress, message });
      } else if (type === 'complete') {
        if (lifecycle.getStatus() === 'running') {
          lifecycle.transition('completed');
          clearTaskTimeout(taskId);
          /** @type {import('../ports/task-port.mjs').TaskResult} */
          const r = { taskId, status: 'completed', result };
          resolvers.get(taskId)?.(r);
          emitComplete(taskId, r);
        }
        releaseWorker(index);
      } else if (type === 'error') {
        if (lifecycle.getStatus() === 'running') {
          lifecycle.transition('failed');
          clearTaskTimeout(taskId);
          /** @type {import('../ports/task-port.mjs').TaskResult} */
          const r = { taskId, status: 'failed', error };
          resolvers.get(taskId)?.(r);
          emitComplete(taskId, r);
        }
        releaseWorker(index);
      }
    };
  }

  /** @param {string} taskId */
  function clearTaskTimeout(taskId) {
    const handle = timeoutHandles.get(taskId);
    if (handle != null) {
      clearTimeout(handle);
      timeoutHandles.delete(taskId);
    }
  }

  /** @param {number} workerIndex */
  function releaseWorker(workerIndex) {
    workerTaskMap.delete(workerIndex);
    idleWorkers.add(workerIndex);
    processQueue();
  }

  /**
   * Replace a worker (used after cancellation/termination).
   * @param {number} workerIndex
   */
  function replaceWorker(workerIndex) {
    const existing = workers[workerIndex];
    if (existing) {
      try {
        existing.terminate();
      } catch {
        /* ignore */
      }
    }
    createWorker(workerIndex);
    processQueue();
  }

  function processQueue() {
    while (queue.length > 0 && idleWorkers.size > 0) {
      const task = queue.shift();
      if (!task) break;
      const workerIdx = idleWorkers.values().next().value;
      idleWorkers.delete(workerIdx);
      dispatchToWorker(workerIdx, task);
    }
  }

  /**
   * @param {number} workerIndex
   * @param {QueuedTask} task
   */
  function dispatchToWorker(workerIndex, task) {
    const { taskId, fn, options } = task;
    const lifecycle = lifecycles.get(taskId);
    if (!lifecycle || lifecycle.getStatus() !== 'pending') return;

    lifecycle.transition('running');
    workerTaskMap.set(workerIndex, taskId);

    if (options.timeout && options.timeout > 0) {
      const handle = setTimeout(() => {
        if (lifecycle.getStatus() === 'running') {
          lifecycle.transition('failed');
          /** @type {import('../ports/task-port.mjs').TaskResult} */
          const r = {
            taskId,
            status: 'failed',
            error: t('task.timeout', { taskId, timeout: options.timeout }),
          };
          resolvers.get(taskId)?.(r);
          emitComplete(taskId, r);
          replaceWorker(workerIndex);
        }
      }, options.timeout);
      timeoutHandles.set(taskId, /** @type {number} */ (handle));
    }

    workers[workerIndex].postMessage({
      taskId,
      fnSource: fn.toString(),
      args: [],
    });
  }

  // Initialize pool
  for (let i = 0; i < poolSize; i++) {
    createWorker(i);
  }

  return {
    enqueue(fn, options = {}) {
      const taskId = `task-${++nextId}`;
      const lifecycle = createTaskLifecycle(taskId);
      lifecycles.set(taskId, lifecycle);
      taskOptions.set(taskId, options);

      /** @type {(r: import('../ports/task-port.mjs').TaskResult) => void} */
      let resolveResult;
      /** @type {Promise<import('../ports/task-port.mjs').TaskResult>} */
      const resultPromise = new Promise((resolve) => {
        resolveResult = resolve;
      });
      resolvers.set(taskId, resolveResult);

      const taskEntry = { taskId, fn, options };

      const execution = resultPromise.then(() => {});
      pendingTasks.add(execution);
      execution.finally(() => pendingTasks.delete(execution));

      if (idleWorkers.size > 0) {
        const workerIdx = idleWorkers.values().next().value;
        idleWorkers.delete(workerIdx);
        dispatchToWorker(workerIdx, taskEntry);
      } else {
        queue.push(taskEntry);
      }

      return {
        id: taskId,
        cancel: () => {
          this.cancel(taskId);
        },
        result: resultPromise,
      };
    },

    cancel(taskId) {
      const lifecycle = lifecycles.get(taskId);
      if (!lifecycle) return;

      const currentStatus = lifecycle.getStatus();

      if (currentStatus === 'pending') {
        // Remove from queue
        const idx = queue.findIndex((q) => q.taskId === taskId);
        if (idx >= 0) queue.splice(idx, 1);
        lifecycle.transition('running');
        lifecycle.transition('cancelled');
        clearTaskTimeout(taskId);
        /** @type {import('../ports/task-port.mjs').TaskResult} */
        const r = {
          taskId,
          status: 'cancelled',
          error: t('task.cancelled', { taskId }),
        };
        resolvers.get(taskId)?.(r);
        emitComplete(taskId, r);
      } else if (currentStatus === 'running') {
        lifecycle.transition('cancelled');
        clearTaskTimeout(taskId);
        /** @type {import('../ports/task-port.mjs').TaskResult} */
        const r = {
          taskId,
          status: 'cancelled',
          error: t('task.cancelled', { taskId }),
        };
        resolvers.get(taskId)?.(r);
        emitComplete(taskId, r);

        // Find and replace the worker running this task
        for (const [workerIdx, tid] of workerTaskMap) {
          if (tid === taskId) {
            replaceWorker(workerIdx);
            break;
          }
        }
      }
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
      while (pendingTasks.size > 0) {
        await Promise.all([...pendingTasks]);
      }
    },

    destroy() {
      for (const worker of workers) {
        try {
          worker?.terminate();
        } catch {
          /* ignore */
        }
      }
      if (blobUrl && typeof URL !== 'undefined') {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          /* ignore */
        }
      }
      for (const [taskId, resolver] of resolvers) {
        const lifecycle = lifecycles.get(taskId);
        if (lifecycle && !['completed', 'failed', 'cancelled'].includes(lifecycle.getStatus())) {
          /** @type {import('../ports/task-port.mjs').TaskResult} */
          const r = {
            taskId,
            status: 'cancelled',
            error: t('task.cancelled', { taskId }),
          };
          resolver(r);
        }
      }
      lifecycles.clear();
      resolvers.clear();
      progressListeners.clear();
      completeListeners.clear();
      timeoutHandles.clear();
      taskOptions.clear();
      queue.length = 0;
      pendingTasks.clear();
    },
  };
}
