/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Remote adapter for the log module.
 * @sidecar remote-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx log
 * @public false
 * @edit careful
 */

/**
 * Remote log adapter.
 * Buffers log entries and sends them as JSON arrays via HTTP POST (native fetch).
 * Send errors are silently discarded.
 *
 * SpecRefs: TPL-141
 */

import { shouldLog } from '../domain/log-levels.mjs';

/**
 * @typedef {object} RemoteAdapterOptions
 * @property {string} endpoint
 * @property {number} [batchSize]
 * @property {number} [flushInterval]
 * @property {Record<string, string>} [headers]
 * @property {import('../ports/log-port.mjs').LogLevel} [minLevel]
 * @property {string} [scope]
 * @property {import('../ports/log-port.mjs').LogEntry[]} [_buffer] - internal shared buffer
 * @property {object} [_shared] - internal shared timer state
 */

/**
 * @param {RemoteAdapterOptions} options
 * @returns {import('../ports/log-port.mjs').LogPort & { flush: () => Promise<void>, destroy: () => Promise<void> }}
 */
export function createRemoteAdapter(options) {
  const {
    endpoint,
    batchSize = 10,
    flushInterval = 5000,
    headers = {},
    minLevel = 'debug',
    scope = '',
  } = options;

  // Shared mutable state: buffer and timer.
  // Child adapters share these via options._buffer and options._shared.
  const buffer = options._buffer || [];
  const shared = options._shared || { timer: null };

  function startTimer() {
    if (shared.timer != null || flushInterval <= 0) return;
    shared.timer = setInterval(() => {
      flush().catch(() => {});
    }, flushInterval);
    // Unref the timer so it doesn't keep the process alive.
    if (shared.timer && typeof shared.timer.unref === 'function') {
      shared.timer.unref();
    }
  }

  async function flush() {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(batch),
      });
    } catch {
      // Send errors silently discarded.
    }
  }

  async function destroy() {
    if (shared.timer != null) {
      clearInterval(shared.timer);
      shared.timer = null;
    }
    await flush();
  }

  /**
   * @param {import('../ports/log-port.mjs').LogLevel} level
   * @param {string} message
   * @param {*} [data]
   */
  function log(level, message, data) {
    if (!shouldLog(level, minLevel)) return;

    /** @type {import('../ports/log-port.mjs').LogEntry} */
    const entry = {
      level,
      message,
      timestamp: Date.now(),
    };

    if (scope) entry.scope = scope;
    if (data !== undefined) entry.data = data;

    buffer.push(entry);
    startTimer();

    if (buffer.length >= batchSize) {
      flush().catch(() => {});
    }
  }

  return {
    debug(msg, data) {
      log('debug', msg, data);
    },
    info(msg, data) {
      log('info', msg, data);
    },
    warn(msg, data) {
      log('warn', msg, data);
    },
    error(msg, data) {
      log('error', msg, data);
    },
    child(childScope) {
      const newScope = scope ? `${scope}:${childScope}` : childScope;
      return createRemoteAdapter({
        endpoint,
        batchSize,
        flushInterval,
        headers,
        minLevel,
        scope: newScope,
        _buffer: buffer,
        _shared: shared,
      });
    },
    flush,
    destroy,
  };
}
