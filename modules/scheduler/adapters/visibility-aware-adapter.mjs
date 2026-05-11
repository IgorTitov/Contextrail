/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Visibility Aware adapter for the scheduler module.
 * @sidecar visibility-aware-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Visibility-aware scheduler adapter.
 * Wraps another SchedulerPort adapter and pauses/resumes based on tab visibility.
 * Implements the SchedulerPort contract.
 *
 * SpecRefs: TPL-171
 *
 * @param {import('../ports/scheduler-port.mjs').SchedulerPort} [innerAdapter]
 * @returns {import('../ports/scheduler-port.mjs').SchedulerPort & { isVisible: () => boolean }}
 */

import { createIntervalAdapter } from './interval-adapter.mjs';
import { assertSchedulerPort } from '../ports/scheduler-port.mjs';

const hasDocument =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.document !== 'undefined' &&
  globalThis.document != null;

export function createVisibilityAwareAdapter(innerAdapter) {
  const inner = innerAdapter ?? createIntervalAdapter();

  /** @type {Set<string>} IDs paused due to visibility (not user-initiated pause) */
  const pausedByVisibility = new Set();

  /** @type {Set<string>} All schedule IDs managed by this adapter */
  const managedIds = new Set();

  /** @type {Map<string, { catchUp?: boolean }>} Per-schedule options */
  const scheduleOptions = new Map();

  function currentlyVisible() {
    if (!hasDocument) return true;
    return globalThis.document.visibilityState !== 'hidden';
  }

  function onVisibilityChange() {
    if (currentlyVisible()) {
      // Tab became visible: resume schedules paused by visibility
      for (const id of pausedByVisibility) {
        const opts = scheduleOptions.get(id);
        if (opts?.catchUp) {
          // Run a catch-up execution via resume then let normal scheduling continue
        }
        inner.resume(id);
      }
      pausedByVisibility.clear();
    } else {
      // Tab became hidden: pause all active managed schedules
      for (const id of managedIds) {
        const info = inner.getSchedule(id);
        if (info && info.status === 'active') {
          inner.pause(id);
          pausedByVisibility.add(id);
        }
      }
    }
  }

  if (hasDocument) {
    globalThis.document.addEventListener('visibilitychange', onVisibilityChange);
  }

  /** @type {import('../ports/scheduler-port.mjs').SchedulerPort & { isVisible: () => boolean }} */
  const adapter = {
    schedule(taskFn, config, options) {
      const handle = inner.schedule(taskFn, config, options);
      managedIds.add(handle.id);
      scheduleOptions.set(handle.id, { catchUp: /** @type {any} */ (config).catchUp ?? false });

      // If tab is currently hidden, pause immediately
      if (!currentlyVisible()) {
        inner.pause(handle.id);
        pausedByVisibility.add(handle.id);
      }

      return {
        id: handle.id,
        cancel: () => adapter.cancel(handle.id),
        pause: () => adapter.pause(handle.id),
        resume: () => adapter.resume(handle.id),
      };
    },

    cancel(scheduleId) {
      inner.cancel(scheduleId);
      managedIds.delete(scheduleId);
      pausedByVisibility.delete(scheduleId);
      scheduleOptions.delete(scheduleId);
    },

    pause(scheduleId) {
      // User-initiated pause: remove from visibility-paused set
      pausedByVisibility.delete(scheduleId);
      inner.pause(scheduleId);
    },

    resume(scheduleId) {
      pausedByVisibility.delete(scheduleId);
      inner.resume(scheduleId);
    },

    getSchedule(scheduleId) {
      return inner.getSchedule(scheduleId);
    },

    listSchedules() {
      return inner.listSchedules();
    },

    destroy() {
      if (hasDocument) {
        globalThis.document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      inner.destroy();
      managedIds.clear();
      pausedByVisibility.clear();
      scheduleOptions.clear();
    },

    isVisible() {
      return currentlyVisible();
    },
  };

  assertSchedulerPort(adapter);
  return adapter;
}
