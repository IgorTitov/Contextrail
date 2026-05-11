/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Console monitoring adapter — prints structured events, metrics, and spans for local development.
 * @sidecar console-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx monitoring
 * @public false
 * @edit careful
 */

import {
  buildExceptionEvent,
  buildMessageEvent,
  buildMetric,
  finalizeSpan,
} from '../domain/monitoring.mjs';

/**
 * @typedef {import('../ports/monitoring-port.mjs').MonitoringPort} MonitoringPort
 *
 * @typedef {object} ConsoleMonitoringOptions
 * @property {(line: string) => void} [writer]  Output sink, defaults to console.log.
 * @property {() => number} [now]
 * @property {string[]} [redactKeys]
 */

/**
 * Create a console monitoring adapter. Formats records as single-line JSON so
 * they are grep-able during local development and safe to pipe into tools.
 *
 * @param {ConsoleMonitoringOptions} [options]
 * @returns {MonitoringPort}
 */
export function createConsoleMonitoringAdapter(options = {}) {
  const writer = options.writer ?? ((line) => console.log(line));
  const now = options.now ?? Date.now;
  const redactConfig = { redactKeys: options.redactKeys ?? [] };
  let spanCounter = 0;

  /** @param {object} record */
  const write = (record) => writer(JSON.stringify(record));

  return {
    captureException(error, context) {
      const evt = buildExceptionEvent(error, now(), context, redactConfig);
      write({ type: 'monitoring.event', ...evt });
      return evt;
    },
    captureMessage(message, severity = 'info', context) {
      const evt = buildMessageEvent(message, severity, now(), context, redactConfig);
      write({ type: 'monitoring.event', ...evt });
      return evt;
    },
    increment(name, value = 1, tags) {
      const metric = buildMetric('counter', name, value, now(), tags);
      write({ type: 'monitoring.metric', ...metric });
      return metric;
    },
    gauge(name, value, tags) {
      const metric = buildMetric('gauge', name, value, now(), tags);
      write({ type: 'monitoring.metric', ...metric });
      return metric;
    },
    histogram(name, value, tags) {
      const metric = buildMetric('histogram', name, value, now(), tags);
      write({ type: 'monitoring.metric', ...metric });
      return metric;
    },
    startSpan(name, attributes = {}) {
      spanCounter += 1;
      const id = `span-${spanCounter}`;
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
          write({ type: 'monitoring.span', ...span });
          return span;
        },
      };
    },
    flush() {
      // Console writes synchronously — nothing to flush.
    },
  };
}
