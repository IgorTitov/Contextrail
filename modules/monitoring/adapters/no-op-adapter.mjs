/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose No-op monitoring adapter — swallows all records. Used to disable monitoring in tests and constrained environments.
 * @sidecar no-op-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx monitoring
 * @public false
 * @edit careful
 */

/**
 * @typedef {import('../ports/monitoring-port.mjs').MonitoringPort} MonitoringPort
 */

/**
 * Create a no-op monitoring adapter. Every method returns a minimal valid
 * shape and performs no side effects. Useful for tests that want to disable
 * monitoring entirely, and for environments where no backend is configured.
 *
 * @returns {MonitoringPort}
 */
export function createNoOpMonitoringAdapter() {
  /** @type {MonitoringPort} */
  const adapter = {
    captureException() {
      return null;
    },
    captureMessage() {
      return null;
    },
    increment(name, value = 1, tags) {
      return {
        kind: 'counter',
        name,
        value,
        timestamp: 0,
        tags: normalizeTags(tags),
      };
    },
    gauge(name, value, tags) {
      return {
        kind: 'gauge',
        name,
        value,
        timestamp: 0,
        tags: normalizeTags(tags),
      };
    },
    histogram(name, value, tags) {
      return {
        kind: 'histogram',
        name,
        value,
        timestamp: 0,
        tags: normalizeTags(tags),
      };
    },
    startSpan(name) {
      return {
        id: 'noop',
        name,
        setAttributes() {},
        end() {
          return {
            id: 'noop',
            name,
            startedAt: 0,
            endedAt: 0,
            durationMs: 0,
            status: 'ok',
            attributes: {},
          };
        },
      };
    },
    flush() {},
  };
  return adapter;
}

/**
 * @param {Record<string, unknown> | undefined} tags
 * @returns {Record<string, string>}
 */
function normalizeTags(tags) {
  if (!tags) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(tags)) out[k] = String(v);
  return out;
}
