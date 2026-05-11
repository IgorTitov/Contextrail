/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Monitoring port contract for the monitoring module.
 * @sidecar monitoring-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx monitoring
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for monitoring adapters.
 *
 * A monitoring backend (Sentry, OpenTelemetry, Datadog, console, in-memory
 * buffer) has to satisfy three concerns: events (exceptions + messages),
 * metrics, and spans. Keeping them on one port lets a single adapter reach
 * one backend while still letting callers pick which concern they use.
 *
 * @typedef {import('../domain/monitoring.mjs').Severity} Severity
 * @typedef {import('../domain/monitoring.mjs').MonitoringContext} MonitoringContext
 * @typedef {import('../domain/monitoring.mjs').ExceptionEvent} ExceptionEvent
 * @typedef {import('../domain/monitoring.mjs').MessageEvent} MessageEvent
 * @typedef {import('../domain/monitoring.mjs').Metric} Metric
 * @typedef {import('../domain/monitoring.mjs').Span} Span
 *
 * @typedef {object} PendingSpan
 * @property {string} id
 * @property {string} name
 * @property {(attributes: Record<string, unknown>) => void} setAttributes
 * @property {(status?: 'ok' | 'error') => Span} end
 *
 * @typedef {object} MonitoringPort
 * @property {(error: unknown, context?: MonitoringContext) => ExceptionEvent | null} captureException
 * @property {(message: string, severity?: Severity, context?: MonitoringContext) => MessageEvent | null} captureMessage
 * @property {(name: string, value?: number, tags?: Record<string, unknown>) => Metric} increment
 * @property {(name: string, value: number, tags?: Record<string, unknown>) => Metric} gauge
 * @property {(name: string, value: number, tags?: Record<string, unknown>) => Metric} histogram
 * @property {(name: string, attributes?: Record<string, unknown>) => PendingSpan} startSpan
 * @property {() => void} flush
 */

const REQUIRED_METHODS = [
  ['captureException', 'monitoring.port.missing_capture_exception'],
  ['captureMessage', 'monitoring.port.missing_capture_message'],
  ['increment', 'monitoring.port.missing_increment'],
  ['gauge', 'monitoring.port.missing_gauge'],
  ['histogram', 'monitoring.port.missing_histogram'],
  ['startSpan', 'monitoring.port.missing_start_span'],
  ['flush', 'monitoring.port.missing_flush'],
];

/**
 * Validate that an adapter conforms to the MonitoringPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertMonitoringPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('monitoring.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
