/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the log module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx log
 * @public false
 * @edit careful
 */

/** Log severity level. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** A single log entry. */
export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  scope?: string;
  timestamp: number;
}

/** Options accepted by adapters that support level filtering. */
export interface LogPortOptions {
  minLevel?: LogLevel;
}

/** The port contract that every log adapter must satisfy. */
export interface LogPort {
  debug(msg: string, data?: unknown): void;
  info(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
  child(scope: string): LogPort;
}

/** Options for the structured JSON adapter. */
export interface StructuredJsonAdapterOptions extends LogPortOptions {
  writeFn?: (line: string) => void;
}

/** Options for the remote adapter. */
export interface RemoteAdapterOptions extends LogPortOptions {
  endpoint: string;
  batchSize?: number;
  flushInterval?: number;
  headers?: Record<string, string>;
}

/** Remote adapter extends LogPort with flush/destroy lifecycle. */
export interface RemoteLogPort extends LogPort {
  flush(): Promise<void>;
  destroy(): Promise<void>;
}

export function assertLogPort(adapter: unknown): asserts adapter is LogPort;
export function createConsoleAdapter(options?: LogPortOptions & { scope?: string }): LogPort;
export function createStructuredJsonAdapter(options?: StructuredJsonAdapterOptions & { scope?: string }): LogPort;
export function createNoOpAdapter(): LogPort;
export function createRemoteAdapter(options: RemoteAdapterOptions): RemoteLogPort;

export function t(key: string, params?: Record<string, string | number>): string;
export function setLocale(locale: string): void;
export function getLocale(): string;
export function registerLocale(locale: string, messages: Record<string, string>): void;
export function resetLocale(): void;

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number>;
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean;
