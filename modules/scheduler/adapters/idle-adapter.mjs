/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Idle adapter for the scheduler module.
 * @sidecar idle-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Idle-callback scheduler adapter.
 * Uses requestIdleCallback when available; falls back to setTimeout(fn, 1).
 * Implements the SchedulerPort contract.
 *
 * SpecRefs: TPL-170
 *
 * @returns {import('../ports/scheduler-port.mjs').SchedulerPort}
 */

import { parseCronLike } from '../domain/cron-parser.mjs';
import { addJitter } from '../domain/jitter.mjs';
import { assertSchedulerPort } from '../ports/scheduler-port.mjs';

const hasIdleCallback =
  typeof globalThis !== 'undefined' && typeof globalThis.requestIdleCallback === 'function';

/**
 * @param {() => void} fn
 * @param {{ timeout?: number }} [opts]
 * @returns {number}
 */
function requestIdle(fn, opts) {
  if (hasIdleCallback) {
    return globalThis.requestIdleCallback(fn, opts);
  }
  return /** @type {number} */ (/** @type {unknown} */ (setTimeout(fn, 1)));
}

/**
 * @param {number} handle
 */
function cancelIdle(handle) {
  if (hasIdleCallback) {
    globalThis.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

let idSeq = 0;

/**
 * @typedef {object} IdleSchedule
 * @property {string} id
 * @property {() => void | Promise<void>} taskFn
 * @property {number} baseInterval
 * @property {import('../ports/scheduler-port.mjs').ScheduleStatus} status
 * @property {number} runCount
 * @property {number | undefined} lastRun
 * @property {number | undefined} nextRun
 * @property {ReturnType<typeof setTimeout> | null} delayTimerId
 * @property {number | null} idleHandle
 * @property {number | undefined} maxRuns
 * @property {number | undefined} jitter
 * @property {((error: Error) => void) | undefined} onError
 * @property {number | undefined} remainingTime
 * @property {number | undefined} scheduledAt
 * @property {number | undefined} timeout
 * @property {string | undefined} name
 */

export function createIdleAdapter() {
  /** @type {Map<string, IdleSchedule>} */
  const schedules = new Map();

  /**
   * @param {IdleSchedule} entry
   */
  function computeInterval(entry) {
    if (entry.jitter != null && entry.jitter > 0) {
      return addJitter(entry.baseInterval, entry.jitter);
    }
    return entry.baseInterval;
  }

  /**
   * @param {IdleSchedule} entry
   */
  function runTaskInIdle(entry) {
    if (entry.status !== 'active') return;

    entry.idleHandle = requestIdle(
      () => {
        if (entry.status !== 'active') return;

        try {
          const result = entry.taskFn();
          if (result && typeof result.catch === 'function') {
            result.catch((/** @type {Error} */ err) => {
              if (entry.onError) entry.onError(err);
            });
          }
        } catch (err) {
          if (entry.onError) entry.onError(/** @type {Error} */ (err));
        }

        entry.runCount++;
        entry.lastRun = Date.now();

        if (entry.maxRuns != null && entry.runCount >= entry.maxRuns) {
          entry.delayTimerId = null;
          entry.idleHandle = null;
          entry.status = 'completed';
          entry.nextRun = undefined;
          return;
        }

        scheduleNext(entry);
      },
      entry.timeout != null ? { timeout: entry.timeout } : undefined,
    );
  }

  /**
   * @param {IdleSchedule} entry
   */
  function scheduleNext(entry) {
    if (entry.status !== 'active') return;
    const interval = computeInterval(entry);
    entry.scheduledAt = Date.now();
    entry.nextRun = entry.scheduledAt + interval;
    entry.delayTimerId = setTimeout(() => {
      entry.delayTimerId = null;
      runTaskInIdle(entry);
    }, interval);
  }

  function clearEntry(entry) {
    if (entry.delayTimerId != null) {
      clearTimeout(entry.delayTimerId);
      entry.delayTimerId = null;
    }
    if (entry.idleHandle != null) {
      cancelIdle(entry.idleHandle);
      entry.idleHandle = null;
    }
  }

  /** @type {import('../ports/scheduler-port.mjs').SchedulerPort} */
  const adapter = {
    schedule(taskFn, config, options) {
      const id = `idle-${++idSeq}`;
      const baseInterval = parseCronLike(config.interval);

      /** @type {IdleSchedule} */
      const entry = {
        id,
        taskFn,
        baseInterval,
        status: 'active',
        runCount: 0,
        lastRun: undefined,
        nextRun: undefined,
        delayTimerId: null,
        idleHandle: null,
        maxRuns: config.maxRuns,
        jitter: config.jitter,
        onError: config.onError,
        remainingTime: undefined,
        scheduledAt: undefined,
        timeout: undefined,
        name: options?.name,
      };

      schedules.set(id, entry);

      if (config.immediate) {
        runTaskInIdle(entry);
        if (entry.status !== 'active') {
          // completed after immediate
        }
      }

      if (entry.status === 'active' && entry.delayTimerId == null && entry.idleHandle == null) {
        scheduleNext(entry);
      }

      return {
        id,
        cancel: () => adapter.cancel(id),
        pause: () => adapter.pause(id),
        resume: () => adapter.resume(id),
      };
    },

    cancel(scheduleId) {
      const entry = schedules.get(scheduleId);
      if (!entry) return;
      clearEntry(entry);
      entry.status = 'cancelled';
      entry.nextRun = undefined;
    },

    pause(scheduleId) {
      const entry = schedules.get(scheduleId);
      if (!entry || entry.status !== 'active') return;

      if (entry.scheduledAt != null && entry.nextRun != null) {
        entry.remainingTime = Math.max(1, entry.nextRun - Date.now());
      } else {
        entry.remainingTime = entry.baseInterval;
      }

      clearEntry(entry);
      entry.status = 'paused';
      entry.nextRun = undefined;
    },

    resume(scheduleId) {
      const entry = schedules.get(scheduleId);
      if (!entry || entry.status !== 'paused') return;

      entry.status = 'active';
      const delay = entry.remainingTime ?? entry.baseInterval;
      entry.scheduledAt = Date.now();
      entry.nextRun = Date.now() + delay;
      entry.delayTimerId = setTimeout(() => {
        entry.delayTimerId = null;
        runTaskInIdle(entry);
      }, delay);
      entry.remainingTime = undefined;
    },

    getSchedule(scheduleId) {
      const entry = schedules.get(scheduleId);
      if (!entry) return undefined;
      return {
        id: entry.id,
        status: entry.status,
        runCount: entry.runCount,
        lastRun: entry.lastRun,
        nextRun: entry.nextRun,
      };
    },

    listSchedules() {
      return [...schedules.values()].map((entry) => ({
        id: entry.id,
        status: entry.status,
        runCount: entry.runCount,
        lastRun: entry.lastRun,
        nextRun: entry.nextRun,
      }));
    },

    destroy() {
      for (const [id] of schedules) {
        adapter.cancel(id);
      }
    },
  };

  assertSchedulerPort(adapter);
  return adapter;
}
