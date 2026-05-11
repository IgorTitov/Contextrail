/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the monitoring bounded module — event/metric/span building, redaction, sampling, and adapter behavior.
 * @sidecar monitoring.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExceptionEvent,
  buildMessageEvent,
  buildMetric,
  finalizeSpan,
  redact,
  redactContext,
  shouldSample,
  assertMonitoringPort,
  createMemoryMonitoringAdapter,
  createConsoleMonitoringAdapter,
  createNoOpMonitoringAdapter,
} from '../../modules/monitoring/public-api.mjs';

describe('monitoring domain — events', () => {
  test('buildExceptionEvent captures name, message, and stack from an Error', () => {
    const err = new Error('boom');
    err.name = 'BoomError';
    const evt = buildExceptionEvent(err, 1000, { tags: { route: '/x' } });
    assert.equal(evt.kind, 'exception');
    assert.equal(evt.severity, 'error');
    assert.equal(evt.name, 'BoomError');
    assert.equal(evt.message, 'boom');
    assert.equal(typeof evt.stack, 'string');
    assert.deepEqual(evt.context.tags, { route: '/x' });
    assert.equal(evt.timestamp, 1000);
  });

  test('buildExceptionEvent tolerates non-Error throwables', () => {
    const evt = buildExceptionEvent('string error', 0);
    assert.equal(evt.name, 'Error');
    assert.equal(evt.message, 'string error');
  });

  test('buildMessageEvent validates message and severity', () => {
    const evt = buildMessageEvent('hello', 'info', 1);
    assert.equal(evt.kind, 'message');
    assert.equal(evt.severity, 'info');
    assert.equal(evt.message, 'hello');
    assert.throws(() => buildMessageEvent('', 'info', 1), TypeError);
    assert.throws(() => buildMessageEvent('ok', 'bogus', 1), TypeError);
    assert.throws(() => buildMessageEvent('ok', 'info', 'not-a-number'), TypeError);
  });
});

describe('monitoring domain — redaction', () => {
  test('redact replaces the value of listed keys case-insensitively', () => {
    const out = redact({ Authorization: 'secret', name: 'alice' }, ['authorization']);
    assert.equal(out.Authorization, '[REDACTED]');
    assert.equal(out.name, 'alice');
  });

  test('redactContext produces redacted tags and extras and preserves user', () => {
    const ctx = redactContext({ tags: { password: 'p' }, extra: { safe: 1 }, user: 'u1' }, [
      'password',
    ]);
    assert.equal(ctx.tags.password, '[REDACTED]');
    assert.equal(ctx.extra.safe, 1);
    assert.equal(ctx.user, 'u1');
  });

  test('redactContext on empty input returns empty shapes', () => {
    const ctx = redactContext(undefined, ['password']);
    assert.deepEqual(ctx.tags, {});
    assert.deepEqual(ctx.extra, {});
  });
});

describe('monitoring domain — sampling', () => {
  test('shouldSample returns true when rate >= 1', () => {
    assert.equal(shouldSample('any', 1), true);
    assert.equal(shouldSample('any', 1.5), true);
  });

  test('shouldSample returns false when rate <= 0', () => {
    assert.equal(shouldSample('any', 0), false);
    assert.equal(shouldSample('any', -1), false);
  });

  test('shouldSample is deterministic for the same id', () => {
    const a = shouldSample('request-42', 0.5);
    const b = shouldSample('request-42', 0.5);
    assert.equal(a, b);
  });
});

describe('monitoring domain — metrics and spans', () => {
  test('buildMetric stringifies tag values and validates inputs', () => {
    const m = buildMetric('counter', 'http.req', 1, 10, { route: '/a', status: 200 });
    assert.equal(m.kind, 'counter');
    assert.equal(m.name, 'http.req');
    assert.equal(m.value, 1);
    assert.deepEqual(m.tags, { route: '/a', status: '200' });
    assert.throws(() => buildMetric('bogus', 'x', 1, 0), TypeError);
    assert.throws(() => buildMetric('counter', '', 1, 0), TypeError);
    assert.throws(() => buildMetric('counter', 'x', Number.NaN, 0), TypeError);
  });

  test('finalizeSpan computes duration and validates status', () => {
    const span = finalizeSpan(
      { id: 's1', name: 'db.query', startedAt: 100, attributes: { table: 't' } },
      150,
      'ok',
    );
    assert.equal(span.durationMs, 50);
    assert.equal(span.status, 'ok');
    assert.equal(span.attributes.table, 't');
    assert.throws(() => finalizeSpan({ id: 's', name: 'n', startedAt: 0 }, 10, 'bogus'), TypeError);
  });

  test('finalizeSpan clamps negative duration to zero', () => {
    const span = finalizeSpan({ id: 's', name: 'n', startedAt: 100 }, 50);
    assert.equal(span.durationMs, 0);
  });
});

describe('monitoring port — assertMonitoringPort()', () => {
  const full = {
    captureException: () => null,
    captureMessage: () => null,
    increment: () => ({}),
    gauge: () => ({}),
    histogram: () => ({}),
    startSpan: () => ({}),
    flush: () => {},
  };

  test('accepts an adapter with all required methods', () => {
    assert.doesNotThrow(() => assertMonitoringPort(full));
  });

  test('throws on null or non-object', () => {
    assert.throws(() => assertMonitoringPort(null), TypeError);
    assert.throws(() => assertMonitoringPort('nope'), TypeError);
  });

  test('throws when any required method is missing', () => {
    for (const key of Object.keys(full)) {
      const partial = { ...full };
      delete partial[key];
      assert.throws(() => assertMonitoringPort(partial), TypeError, `missing ${key}`);
    }
  });
});

describe('monitoring adapter — memory', () => {
  test('satisfies the port contract', () => {
    const m = createMemoryMonitoringAdapter();
    assert.doesNotThrow(() => assertMonitoringPort(m));
  });

  test('buffers events, metrics, and spans with injectable clock', () => {
    let now = 1000;
    const m = createMemoryMonitoringAdapter({ now: () => now });
    m.captureMessage('hello', 'info');
    m.captureException(new Error('boom'));
    m.increment('req', 2, { route: '/a' });
    m.gauge('mem', 42);
    m.histogram('lat', 15);
    const span = m.startSpan('work');
    now += 25;
    span.end('ok');

    assert.equal(m.events().length, 2);
    assert.equal(m.metrics().length, 3);
    assert.equal(m.spans().length, 1);
    assert.equal(m.spans()[0].durationMs, 25);
  });

  test('redactKeys scrub context before storing', () => {
    const m = createMemoryMonitoringAdapter({ redactKeys: ['password'] });
    m.captureMessage('login', 'info', { tags: { password: 'hunter2', user: 'u' } });
    const evt = m.events()[0];
    assert.equal(evt.context.tags.password, '[REDACTED]');
    assert.equal(evt.context.tags.user, 'u');
  });

  test('sampleRate = 0 drops all events', () => {
    const m = createMemoryMonitoringAdapter({ sampleRate: 0 });
    assert.equal(m.captureMessage('x', 'info'), null);
    assert.equal(m.events().length, 0);
  });

  test('clear empties the buffers and resets span ids', () => {
    const m = createMemoryMonitoringAdapter();
    m.increment('x');
    m.clear();
    assert.equal(m.metrics().length, 0);
  });

  test('invalid sampleRate is rejected at construction', () => {
    assert.throws(() => createMemoryMonitoringAdapter({ sampleRate: 2 }), TypeError);
    assert.throws(() => createMemoryMonitoringAdapter({ sampleRate: -0.1 }), TypeError);
  });
});

describe('monitoring adapter — console', () => {
  test('satisfies the port contract and writes JSON lines', () => {
    const lines = [];
    const m = createConsoleMonitoringAdapter({
      writer: (line) => lines.push(line),
      now: () => 5,
    });
    assert.doesNotThrow(() => assertMonitoringPort(m));
    m.captureMessage('hi', 'info');
    m.increment('x');
    const s = m.startSpan('w');
    s.end('ok');
    assert.equal(lines.length, 3);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.ok(parsed.type?.startsWith('monitoring.'));
    }
  });
});

describe('monitoring adapter — no-op', () => {
  test('satisfies the port contract and returns null events', () => {
    const m = createNoOpMonitoringAdapter();
    assert.doesNotThrow(() => assertMonitoringPort(m));
    assert.equal(m.captureException(new Error('x')), null);
    assert.equal(m.captureMessage('x'), null);
    const metric = m.increment('x');
    assert.equal(metric.kind, 'counter');
    const span = m.startSpan('x');
    const result = span.end();
    assert.equal(result.durationMs, 0);
    m.flush();
  });
});
