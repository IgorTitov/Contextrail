/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of log-test in this repository.
 * @sidecar log.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertLogPort,
  createConsoleAdapter,
  createStructuredJsonAdapter,
  createNoOpAdapter,
  createRemoteAdapter,
  createFileLogAdapter,
} from '../../modules/log/public-api.mjs';

// ---------------------------------------------------------------------------
// assertLogPort
// ---------------------------------------------------------------------------

describe('log port — assertLogPort()', () => {
  test('accepts a valid adapter with all five methods', () => {
    const adapter = {
      debug() {},
      info() {},
      warn() {},
      error() {},
      child() {
        return this;
      },
    };
    assert.doesNotThrow(() => assertLogPort(adapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertLogPort(null), TypeError);
  });

  test('throws for undefined', () => {
    assert.throws(() => assertLogPort(undefined), TypeError);
  });

  test('throws for a primitive', () => {
    assert.throws(() => assertLogPort('string'), TypeError);
  });

  test('throws for missing debug', () => {
    assert.throws(() => assertLogPort({ info() {}, warn() {}, error() {}, child() {} }), TypeError);
  });

  test('throws for missing info', () => {
    assert.throws(
      () => assertLogPort({ debug() {}, warn() {}, error() {}, child() {} }),
      TypeError,
    );
  });

  test('throws for missing warn', () => {
    assert.throws(
      () => assertLogPort({ debug() {}, info() {}, error() {}, child() {} }),
      TypeError,
    );
  });

  test('throws for missing error', () => {
    assert.throws(() => assertLogPort({ debug() {}, info() {}, warn() {}, child() {} }), TypeError);
  });

  test('throws for missing child', () => {
    assert.throws(() => assertLogPort({ debug() {}, info() {}, warn() {}, error() {} }), TypeError);
  });

  test('error message uses i18n key for invalid adapter', () => {
    assert.throws(
      () => assertLogPort(null),
      (err) => err.message.includes('LogPort adapter must be a non-null object'),
    );
  });

  test('error message uses i18n key for missing method', () => {
    assert.throws(
      () => assertLogPort({ debug() {}, info() {}, warn() {}, error() {} }),
      (err) => err.message.includes('LogPort adapter must implement child()'),
    );
  });
});

// ---------------------------------------------------------------------------
// ConsoleAdapter
// ---------------------------------------------------------------------------

describe('log adapter — consoleAdapter', () => {
  /** @type {Record<string, import('node:test').Mock<Function>>} */
  let spies;

  beforeEach(() => {
    spies = {
      debug: mock.fn(),
      info: mock.fn(),
      warn: mock.fn(),
      error: mock.fn(),
    };
    mock.method(console, 'debug', spies.debug);
    mock.method(console, 'info', spies.info);
    mock.method(console, 'warn', spies.warn);
    mock.method(console, 'error', spies.error);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertLogPort(createConsoleAdapter()));
  });

  test('logs at correct levels', () => {
    const logger = createConsoleAdapter();
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    assert.equal(spies.debug.mock.callCount(), 1);
    assert.equal(spies.info.mock.callCount(), 1);
    assert.equal(spies.warn.mock.callCount(), 1);
    assert.equal(spies.error.mock.callCount(), 1);
  });

  test('passes message and data to console', () => {
    const logger = createConsoleAdapter();
    const data = { key: 'value' };
    logger.info('hello', data);

    assert.equal(spies.info.mock.callCount(), 1);
    const args = spies.info.mock.calls[0].arguments;
    assert.equal(args[0], 'hello');
    assert.deepEqual(args[1], data);
  });

  test('respects minLevel — filters out lower levels', () => {
    const logger = createConsoleAdapter({ minLevel: 'warn' });
    logger.debug('should not appear');
    logger.info('should not appear');
    logger.warn('should appear');
    logger.error('should appear');

    assert.equal(spies.debug.mock.callCount(), 0);
    assert.equal(spies.info.mock.callCount(), 0);
    assert.equal(spies.warn.mock.callCount(), 1);
    assert.equal(spies.error.mock.callCount(), 1);
  });

  test('child extends scope', () => {
    const logger = createConsoleAdapter();
    const child = logger.child('db');
    child.info('query');

    assert.equal(spies.info.mock.callCount(), 1);
    const args = spies.info.mock.calls[0].arguments;
    assert.equal(args[0], '[db]');
    assert.equal(args[1], 'query');
  });

  test('child chains scope with colon separator', () => {
    const logger = createConsoleAdapter();
    const child = logger.child('app').child('db');
    child.warn('slow');

    const args = spies.warn.mock.calls[0].arguments;
    assert.equal(args[0], '[app:db]');
  });

  test('child satisfies the port contract', () => {
    const child = createConsoleAdapter().child('test');
    assert.doesNotThrow(() => assertLogPort(child));
  });
});

// ---------------------------------------------------------------------------
// StructuredJsonAdapter
// ---------------------------------------------------------------------------

describe('log adapter — structuredJsonAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertLogPort(createStructuredJsonAdapter()));
  });

  test('outputs valid JSON lines', () => {
    const lines = [];
    const logger = createStructuredJsonAdapter({ writeFn: (line) => lines.push(line) });
    logger.info('hello');

    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.message, 'hello');
    assert.equal(typeof parsed.timestamp, 'number');
  });

  test('includes all LogEntry fields', () => {
    const lines = [];
    const logger = createStructuredJsonAdapter({ writeFn: (line) => lines.push(line) });
    logger.error('fail', { code: 500 });

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.level, 'error');
    assert.equal(parsed.message, 'fail');
    assert.deepEqual(parsed.data, { code: 500 });
    assert.equal(typeof parsed.timestamp, 'number');
  });

  test('includes scope when set via child', () => {
    const lines = [];
    const logger = createStructuredJsonAdapter({ writeFn: (line) => lines.push(line) });
    const child = logger.child('http');
    child.info('request');

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.scope, 'http');
  });

  test('respects minLevel', () => {
    const lines = [];
    const logger = createStructuredJsonAdapter({
      writeFn: (line) => lines.push(line),
      minLevel: 'error',
    });
    logger.debug('skip');
    logger.info('skip');
    logger.warn('skip');
    logger.error('keep');

    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).level, 'error');
  });

  test('child satisfies the port contract', () => {
    const child = createStructuredJsonAdapter().child('test');
    assert.doesNotThrow(() => assertLogPort(child));
  });

  test('child chains scope with colon separator', () => {
    const lines = [];
    const logger = createStructuredJsonAdapter({ writeFn: (line) => lines.push(line) });
    logger.child('app').child('db').info('query');

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.scope, 'app:db');
  });
});

// ---------------------------------------------------------------------------
// NoOpAdapter
// ---------------------------------------------------------------------------

describe('log adapter — noOpAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertLogPort(createNoOpAdapter()));
  });

  test('produces no output', () => {
    const spy = mock.fn();
    mock.method(console, 'debug', spy);
    mock.method(console, 'info', spy);
    mock.method(console, 'warn', spy);
    mock.method(console, 'error', spy);

    const logger = createNoOpAdapter();
    logger.debug('x');
    logger.info('x');
    logger.warn('x');
    logger.error('x');

    assert.equal(spy.mock.callCount(), 0);
    mock.restoreAll();
  });

  test('child returns a no-op adapter', () => {
    const child = createNoOpAdapter().child('scope');
    assert.doesNotThrow(() => assertLogPort(child));
  });

  test('child of child produces no output', () => {
    const spy = mock.fn();
    mock.method(console, 'log', spy);
    const child = createNoOpAdapter().child('a').child('b');
    child.info('test');
    assert.equal(spy.mock.callCount(), 0);
    mock.restoreAll();
  });
});

// ---------------------------------------------------------------------------
// RemoteAdapter
// ---------------------------------------------------------------------------

describe('log adapter — remoteAdapter', () => {
  /** @type {import('node:test').Mock<Function>} */
  let fetchMock;
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = mock.fn(() => Promise.resolve({ ok: true }));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('satisfies the port contract', () => {
    const adapter = createRemoteAdapter({ endpoint: 'http://localhost/logs', flushInterval: 0 });
    assert.doesNotThrow(() => assertLogPort(adapter));
  });

  test('buffers entries without sending immediately', () => {
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 5,
      flushInterval: 0,
    });
    adapter.info('a');
    adapter.info('b');

    assert.equal(fetchMock.mock.callCount(), 0);
  });

  test('flushes when buffer reaches batchSize', async () => {
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 3,
      flushInterval: 0,
    });

    adapter.info('a');
    adapter.info('b');
    adapter.info('c');

    // Flush happens asynchronously; give it a tick.
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(fetchMock.mock.callCount(), 1);
    const callArgs = fetchMock.mock.calls[0].arguments;
    assert.equal(callArgs[0], 'http://localhost/logs');
    const body = JSON.parse(callArgs[1].body);
    assert.equal(body.length, 3);
    assert.equal(body[0].message, 'a');
  });

  test('manual flush sends buffered entries', async () => {
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 100,
      flushInterval: 0,
    });

    adapter.info('manual');
    await adapter.flush();

    assert.equal(fetchMock.mock.callCount(), 1);
    const body = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
    assert.equal(body.length, 1);
    assert.equal(body[0].message, 'manual');
  });

  test('flush with empty buffer does not send', async () => {
    const adapter = createRemoteAdapter({ endpoint: 'http://localhost/logs', flushInterval: 0 });
    await adapter.flush();
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  test('destroy flushes remaining entries', async () => {
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 100,
      flushInterval: 0,
    });

    adapter.warn('remaining');
    await adapter.destroy();

    assert.equal(fetchMock.mock.callCount(), 1);
    const body = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
    assert.equal(body[0].message, 'remaining');
  });

  test('send errors are silently discarded', async () => {
    globalThis.fetch = mock.fn(() => Promise.reject(new Error('network')));
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 100,
      flushInterval: 0,
    });

    adapter.error('will fail');
    // Should not throw.
    await adapter.flush();
  });

  test('respects minLevel', async () => {
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 100,
      flushInterval: 0,
      minLevel: 'warn',
    });

    adapter.debug('skip');
    adapter.info('skip');
    adapter.warn('keep');
    adapter.error('keep');
    await adapter.flush();

    assert.equal(fetchMock.mock.callCount(), 1);
    const body = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
    assert.equal(body.length, 2);
  });

  test('child shares buffer and extends scope', async () => {
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 100,
      flushInterval: 0,
    });

    const child = adapter.child('db');
    child.info('query');
    await adapter.flush();

    const body = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
    assert.equal(body.length, 1);
    assert.equal(body[0].scope, 'db');
    assert.equal(body[0].message, 'query');
  });

  test('child satisfies the port contract', () => {
    const child = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      flushInterval: 0,
    }).child('test');
    assert.doesNotThrow(() => assertLogPort(child));
  });

  test('sends correct headers', async () => {
    const adapter = createRemoteAdapter({
      endpoint: 'http://localhost/logs',
      batchSize: 100,
      flushInterval: 0,
      headers: { 'X-Api-Key': 'secret' },
    });

    adapter.info('test');
    await adapter.flush();

    const opts = fetchMock.mock.calls[0].arguments[1];
    assert.equal(opts.headers['Content-Type'], 'application/json');
    assert.equal(opts.headers['X-Api-Key'], 'secret');
  });
});

// ---------------------------------------------------------------------------
// FileLogAdapter
// ---------------------------------------------------------------------------

describe('log adapter — fileLogAdapter', () => {
  /** @type {string[]} */
  let lines;

  /** @type {(line: string) => void} */
  let writeFn;

  beforeEach(() => {
    lines = [];
    writeFn = (line) => lines.push(line);
  });

  test('satisfies the port contract', () => {
    const logger = createFileLogAdapter({ writeFn });
    assert.doesNotThrow(() => assertLogPort(logger));
  });

  test('writes structured JSON lines', () => {
    const logger = createFileLogAdapter({ writeFn });
    logger.info('hello');

    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.message, 'hello');
    assert.equal(typeof parsed.timestamp, 'number');
  });

  test('includes data when provided', () => {
    const logger = createFileLogAdapter({ writeFn });
    logger.error('fail', { code: 500 });

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.level, 'error');
    assert.deepEqual(parsed.data, { code: 500 });
  });

  test('does not include data field when omitted', () => {
    const logger = createFileLogAdapter({ writeFn });
    logger.info('simple');

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.data, undefined);
  });

  test('respects minLevel', () => {
    const logger = createFileLogAdapter({ writeFn, minLevel: 'warn' });
    logger.debug('skip');
    logger.info('skip');
    logger.warn('keep');
    logger.error('keep');

    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).level, 'warn');
    assert.equal(JSON.parse(lines[1]).level, 'error');
  });

  test('child sets scope', () => {
    const logger = createFileLogAdapter({ writeFn });
    const child = logger.child('db');
    child.info('query');

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.scope, 'db');
  });

  test('child chains scope with colon separator', () => {
    const logger = createFileLogAdapter({ writeFn });
    logger.child('app').child('db').warn('slow');

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.scope, 'app:db');
  });

  test('child satisfies the port contract', () => {
    const child = createFileLogAdapter({ writeFn }).child('test');
    assert.doesNotThrow(() => assertLogPort(child));
  });

  test('all four log levels write output', () => {
    const logger = createFileLogAdapter({ writeFn });
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    assert.equal(lines.length, 4);
    assert.equal(JSON.parse(lines[0]).level, 'debug');
    assert.equal(JSON.parse(lines[1]).level, 'info');
    assert.equal(JSON.parse(lines[2]).level, 'warn');
    assert.equal(JSON.parse(lines[3]).level, 'error');
  });
});
