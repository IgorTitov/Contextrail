/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Interval adapter for the scheduler module.
 * @sidecar interval-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Interval-based scheduler adapter using native setInterval/clearInterval.
 * Implements the SchedulerPort contract.
 *
 * SpecRefs: TPL-169
 *
 * @returns {import('../ports/scheduler-port.mjs').SchedulerPort}
 */

import { parseCronLike } from '../domain/cron-parser.mjs';
import { addJitter } from '../domain/jitter.mjs';
import { assertSchedulerPort } from '../ports/scheduler-port.mjs';

let idSeq = 0;

/**
 * @typedef {object} InternalSchedule
 * @property {string} id
 * @property {() => void | Promise<void>} taskFn
 * @property {number} baseInterval
 * @property {import('../ports/scheduler-port.mjs').ScheduleStatus} status
 * @property {number} runCount
 * @property {number | undefined} lastRun
 * @property {number | undefined} nextRun
 * @property {ReturnType<typeof setTimeout> | null} timerId
 * @property {number | undefined} maxRuns
 * @property {number | undefined} jitter
 * @property {((error: Error) => void) | undefined} onError
 * @property {number | undefined} remainingTime
 * @property {number | undefined} scheduledAt
 * @property {string | undefined} name
 */

export function createIntervalAdapter() {
  /** @type {Map<string, InternalSchedule>} */
  const schedules = new Map();

  /**
   * @param {InternalSchedule} entry
   */
  function computeInterval(entry) {
    if (entry.jitter != null && entry.jitter > 0) {
      return addJitter(entry.baseInterval, entry.jitter);
    }
    return entry.baseInterval;
  }

  /**
   * @param {InternalSchedule} entry
   */
  function runTask(entry) {
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
      clearTimeout(entry.timerId);
      entry.timerId = null;
      entry.status = 'completed';
      entry.nextRun = undefined;
      return;
    }

    scheduleNext(entry);
  }

  /**
   * @param {InternalSchedule} entry
   */
  function scheduleNext(entry) {
    if (entry.status !== 'active') return;
    const interval = computeInterval(entry);
    entry.scheduledAt = Date.now();
    entry.nextRun = entry.scheduledAt + interval;
    entry.timerId = setTimeout(() => runTask(entry), interval);
  }

  /** @type {import('../ports/scheduler-port.mjs').SchedulerPort} */
  const adapter = {
    schedule(taskFn, config, options) {
      const id = `sched-${++idSeq}`;
      const baseInterval = parseCronLike(config.interval);

      /** @type {InternalSchedule} */
      const entry = {
        id,
        taskFn,
        baseInterval,
        status: 'active',
        runCount: 0,
        lastRun: undefined,
        nextRun: undefined,
        timerId: null,
        maxRuns: config.maxRuns,
        jitter: config.jitter,
        onError: config.onError,
        remainingTime: undefined,
        scheduledAt: undefined,
        name: options?.name,
      };

      schedules.set(id, entry);

      if (config.immediate) {
        runTask(entry);
        // If completed after immediate run (maxRuns=1), don't schedule next
        if (entry.status !== 'active') {
          // already handled
        }
      }

      // Only schedule next tick if still active (immediate + maxRuns could complete it)
      if (entry.status === 'active' && entry.timerId == null) {
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
      if (entry.timerId != null) {
        clearTimeout(entry.timerId);
        entry.timerId = null;
      }
      entry.status = 'cancelled';
      entry.nextRun = undefined;
    },

    pause(scheduleId) {
      const entry = schedules.get(scheduleId);
      if (!entry || entry.status !== 'active') return;

      // Calculate remaining time
      if (entry.scheduledAt != null && entry.nextRun != null) {
        entry.remainingTime = Math.max(1, entry.nextRun - Date.now());
      } else {
        entry.remainingTime = entry.baseInterval;
      }

      if (entry.timerId != null) {
        clearTimeout(entry.timerId);
        entry.timerId = null;
      }
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
      entry.timerId = setTimeout(() => runTask(entry), delay);
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
