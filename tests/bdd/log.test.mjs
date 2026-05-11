/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of log-test in this repository.
 * @sidecar log.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for log.feature.
 * Proves user-visible behavior through the log module public API.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertLogPort,
  createConsoleAdapter,
  createStructuredJsonAdapter,
  createNoOpAdapter,
  shouldLog,
  LOG_LEVEL_PRIORITY,
} from '../../modules/log/public-api.mjs';

const feature = readFileSync(new URL('./features/log.feature', import.meta.url), 'utf8');

describe('Feature: Structured logging', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Structured logging'));
    assert.ok(feature.includes('Scenario: Log at each severity level'));
    assert.ok(feature.includes('Scenario: Minimum level filters lower-priority messages'));
    assert.ok(feature.includes('Scenario: No-op adapter discards all output'));
    assert.ok(feature.includes('Scenario: Child logger inherits parent scope'));
    assert.ok(feature.includes('Scenario: Structured JSON adapter formats as JSON'));
  });

  test('Scenario: Log at each severity level', () => {
    const adapter = createConsoleAdapter();
    assertLogPort(adapter);
    // All four methods exist and are callable
    assert.doesNotThrow(() => {
      adapter.debug('d');
      adapter.info('i');
      adapter.warn('w');
      adapter.error('e');
    });
  });

  test('Scenario: Minimum level filters lower-priority messages', () => {
    assert.equal(shouldLog('info', 'warn'), false);
    assert.equal(shouldLog('warn', 'warn'), true);
    assert.equal(shouldLog('error', 'warn'), true);
  });

  test('Scenario: No-op adapter discards all output', () => {
    const adapter = createNoOpAdapter();
    assertLogPort(adapter);
    assert.doesNotThrow(() => {
      adapter.debug('test');
      adapter.info('test');
      adapter.warn('test');
      adapter.error('test');
    });
  });

  test('Scenario: Child logger inherits parent scope', () => {
    const lines = [];
    const parent = createStructuredJsonAdapter({ scope: 'app', writeFn: (l) => lines.push(l) });
    const child = parent.child('db');
    assertLogPort(child);
    child.info('query');
    assert.ok(lines.length >= 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.scope, 'app:db');
  });

  test('Scenario: Structured JSON adapter formats as JSON', () => {
    const lines = [];
    const adapter = createStructuredJsonAdapter({ writeFn: (l) => lines.push(l) });
    assertLogPort(adapter);
    adapter.info('hello');
    assert.ok(lines.length >= 1);
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.message, 'hello');
  });
});
