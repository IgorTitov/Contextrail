/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the task module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx task
 * @public false
 * @edit careful
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskProgress {
  taskId: string;
  progress: number;
  message?: string;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  result?: any;
  error?: string;
}

export interface TaskOptions {
  timeout?: number;
  transferables?: Transferable[];
  onProgress?: (p: TaskProgress) => void;
}

export interface TaskHandle {
  id: string;
  cancel: () => void;
  result: Promise<TaskResult>;
}

export interface TaskPort {
  enqueue(fn: Function, options?: TaskOptions): TaskHandle;
  cancel(taskId: string): void;
  getStatus(taskId: string): TaskStatus | undefined;
  onProgress(taskId: string, callback: (p: TaskProgress) => void): void;
  onComplete(taskId: string, callback: (r: TaskResult) => void): void;
  drain(): Promise<void>;
}

export function assertTaskPort(adapter: unknown): asserts adapter is TaskPort;

export interface TaskLifecycle {
  getStatus(): TaskStatus;
  transition(newStatus: TaskStatus): void;
  onTransition(callback: (from: TaskStatus, to: TaskStatus) => void): void;
}

export function createTaskLifecycle(taskId: string): TaskLifecycle;

export function serializeForTransfer(
  data: any,
  transferables?: Transferable[],
): { data: any; transferables: Transferable[] };

export function createWebWorkerAdapter(options?: {
  poolSize?: number;
}): TaskPort & { destroy: () => void };

export function createMainThreadAdapter(): TaskPort & { destroy: () => void };

export function t(key: string, params?: Record<string, string | number>): string;
export function setLocale(locale: string): void;
export function getLocale(): string;
export function registerLocale(locale: string, messages: Record<string, string>): void;
export function resetLocale(): void;
