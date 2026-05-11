/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory monitoring adapter — buffers events, metrics, and spans for tests and local inspection.
 * @sidecar memory-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx monitoring
 * @public false
 * @edit careful
 */

import {
  buildExceptionEvent,
  buildMessageEvent,
  buildMetric,
  finalizeSpan,
  shouldSample,
} from '../domain/monitoring.mjs';
import { t } from '../messages.mjs';

/**
 * @typedef {import('../ports/monitoring-port.mjs').MonitoringPort} MonitoringPort
 * @typedef {import('../domain/monitoring.mjs').ExceptionEvent} ExceptionEvent
 * @typedef {import('../domain/monitoring.mjs').MessageEvent} MessageEvent
 * @typedef {import('../domain/monitoring.mjs').Metric} Metric
 * @typedef {import('../domain/monitoring.mjs').Span} Span
 * @typedef {import('../domain/monitoring.mjs').Severity} Severity
 * @typedef {import('../domain/monitoring.mjs').MonitoringContext} MonitoringContext
 *
 * @typedef {object} MemoryAdapterOptions
 * @property {() => number} [now]               Clock, defaults to Date.now.
 * @property {() => string} [idFactory]         Span id factory.
 * @property {number} [sampleRate]              0..1, defaults to 1.
 * @property {string[]} [redactKeys]            Keys to redact from contexts.
 */

/**
 * Create an in-memory monitoring adapter. Buffered arrays are exposed via
 * reader functions so tests and introspection can assert what was recorded
 * without reaching into private state.
 *
 * @param {MemoryAdapterOptions} [options]
 * @returns {MonitoringPort & {
 *   events: () => (ExceptionEvent | MessageEvent)[];
 *   metrics: () => Metric[];
 *   spans: () => Span[];
 *   clear: () => void;
 * }}
 */
export function createMemoryMonitoringAdapter(options = {}) {
  if (
    options.sampleRate != null &&
    (typeof options.sampleRate !== 'number' || options.sampleRate < 0 || options.sampleRate > 1)
  ) {
    throw new TypeError(t('monitoring.config.invalid_sample_rate'));
  }
  const now = options.now ?? Date.now;
  const sampleRate = options.sampleRate ?? 1;
  const redactConfig = { redactKeys: options.redactKeys ?? [] };

  let spanCounter = 0;
  const idFactory =
    options.idFactory ??
    (() => {
      spanCounter += 1;
      return `span-${spanCounter}`;
    });

  /** @type {(ExceptionEvent | MessageEvent)[]} */
  const events = [];
  /** @type {Metric[]} */
  const metrics = [];
  /** @type {Span[]} */
  const spans = [];

  return {
    captureException(error, context) {
      const evt = buildExceptionEvent(error, now(), context, redactConfig);
      if (!shouldSample(`${evt.name}:${evt.message}`, sampleRate)) return null;
      events.push(evt);
      return evt;
    },
    captureMessage(message, severity = 'info', context) {
      const evt = buildMessageEvent(message, severity, now(), context, redactConfig);
      if (!shouldSample(`${severity}:${message}`, sampleRate)) return null;
      events.push(evt);
      return evt;
    },
    increment(name, value = 1, tags) {
      const metric = buildMetric('counter', name, value, now(), tags);
      metrics.push(metric);
      return metric;
    },
    gauge(name, value, tags) {
      const metric = buildMetric('gauge', name, value, now(), tags);
      metrics.push(metric);
      return metric;
    },
    histogram(name, value, tags) {
      const metric = buildMetric('histogram', name, value, now(), tags);
      metrics.push(metric);
      return metric;
    },
    startSpan(name, attributes = {}) {
      const id = idFactory();
      const startedAt = now();
      /** @type {Record<string, unknown>} */
      const attrs = { ...attributes };
      return {
        id,
        name,
        setAttributes(extra) {
          Object.assign(attrs, extra);
        },
        end(status = 'ok') {
          const span = finalizeSpan({ id, name, startedAt, attributes: attrs }, now(), status);
          spans.push(span);
          return span;
        },
      };
    },
    flush() {
      // Memory adapter: nothing to flush. Real backends push buffered data.
    },
    events: () => events.slice(),
    metrics: () => metrics.slice(),
    spans: () => spans.slice(),
    clear() {
      events.length = 0;
      metrics.length = 0;
      spans.length = 0;
      spanCounter = 0;
    },
  };
}
