/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the scheduler module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Core type definitions for the scheduler module.
 *
 * SpecRefs: TPL-168; TPL-169; TPL-170; TPL-171
 */

export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface ScheduleConfig {
  interval: number | string;
  immediate?: boolean;
  maxRuns?: number;
  jitter?: number;
  onError?: (error: Error) => void;
}

export interface ScheduleHandle {
  id: string;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

export interface ScheduleInfo {
  id: string;
  status: ScheduleStatus;
  runCount: number;
  lastRun?: number;
  nextRun?: number;
}

export interface ScheduleOptions {
  name?: string;
}

export interface SchedulerPort {
  schedule(taskFn: () => void | Promise<void>, config: ScheduleConfig, options?: ScheduleOptions): ScheduleHandle;
  cancel(scheduleId: string): void;
  pause(scheduleId: string): void;
  resume(scheduleId: string): void;
  getSchedule(scheduleId: string): ScheduleInfo | undefined;
  listSchedules(): ScheduleInfo[];
  destroy(): void;
}

export function assertSchedulerPort(adapter: unknown): asserts adapter is SchedulerPort;
export function parseCronLike(expression: number | string): number;
export function addJitter(interval: number, jitterRange: number): number;
export function createIntervalAdapter(): SchedulerPort;
export function createIdleAdapter(): SchedulerPort;
export function createVisibilityAwareAdapter(innerAdapter?: SchedulerPort): SchedulerPort & { isVisible(): boolean };
