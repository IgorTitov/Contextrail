/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the monitoring bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx monitoring
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the monitoring bounded module.
 * The only file other modules may import.
 */

// Domain
export {
  buildExceptionEvent,
  buildMessageEvent,
  buildMetric,
  finalizeSpan,
  redact,
  redactContext,
  shouldSample,
} from './domain/monitoring.mjs';

// Ports
export { assertMonitoringPort } from './ports/monitoring-port.mjs';

// Adapters
export { createMemoryMonitoringAdapter } from './adapters/memory-adapter.mjs';
export { createConsoleMonitoringAdapter } from './adapters/console-adapter.mjs';
export { createNoOpMonitoringAdapter } from './adapters/no-op-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
