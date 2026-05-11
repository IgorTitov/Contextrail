/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Scheduler port contract for the scheduler module.
 * @sidecar scheduler-port.mjs.header.md
 * @layer module | @hex port | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Port contract for scheduler adapters.
 *
 * @typedef {'active' | 'paused' | 'completed' | 'cancelled'} ScheduleStatus
 *
 * @typedef {object} ScheduleConfig
 * @property {number | string} interval - Milliseconds or cron-like string ('every 5s', 'every 30m')
 * @property {boolean} [immediate] - Run task once immediately on schedule
 * @property {number} [maxRuns] - Auto-complete schedule after this many runs
 * @property {number} [jitter] - Random jitter range in ms added/subtracted from interval
 * @property {(error: Error) => void} [onError] - Error handler for task exceptions
 *
 * @typedef {object} ScheduleHandle
 * @property {string} id
 * @property {() => void} cancel
 * @property {() => void} pause
 * @property {() => void} resume
 *
 * @typedef {object} ScheduleInfo
 * @property {string} id
 * @property {ScheduleStatus} status
 * @property {number} runCount
 * @property {number} [lastRun]
 * @property {number} [nextRun]
 *
 * @typedef {object} ScheduleOptions
 * @property {string} [name]
 *
 * @typedef {object} SchedulerPort
 * @property {(taskFn: () => void | Promise<void>, config: ScheduleConfig, options?: ScheduleOptions) => ScheduleHandle} schedule
 * @property {(scheduleId: string) => void} cancel
 * @property {(scheduleId: string) => void} pause
 * @property {(scheduleId: string) => void} resume
 * @property {(scheduleId: string) => ScheduleInfo | undefined} getSchedule
 * @property {() => ScheduleInfo[]} listSchedules
 * @property {() => void} destroy
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = [
  'schedule',
  'cancel',
  'pause',
  'resume',
  'getSchedule',
  'listSchedules',
  'destroy',
];

/**
 * Validate that an adapter conforms to the SchedulerPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertSchedulerPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('scheduler.port.not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('scheduler.port.missing_method', { method }));
    }
  }
}
