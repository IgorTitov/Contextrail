/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of scheduler-test in this repository.
 * @sidecar scheduler.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for scheduler.feature.
 * Proves user-visible behavior through the scheduler module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertSchedulerPort, createIntervalAdapter } from '../../modules/scheduler/public-api.mjs';

const feature = readFileSync(new URL('./features/scheduler.feature', import.meta.url), 'utf8');

describe('Feature: Task scheduling', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = createIntervalAdapter();
    assertSchedulerPort(scheduler);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Task scheduling'));
    assert.ok(feature.includes('Scenario: Schedule a recurring task'));
    assert.ok(feature.includes('Scenario: Cancel a scheduled task'));
    assert.ok(feature.includes('Scenario: Max runs auto-completes a schedule'));
    assert.ok(feature.includes('Scenario: List all active schedules'));
    assert.ok(feature.includes('Scenario: Destroy cancels all schedules'));
  });

  test('Scenario: Schedule a recurring task', { timeout: 5000 }, async () => {
    let count = 0;
    scheduler.schedule(
      () => {
        count++;
      },
      { interval: 50, maxRuns: 3 },
    );
    await new Promise((r) => setTimeout(r, 300));
    assert.ok(count >= 3);
  });

  test('Scenario: Cancel a scheduled task', { timeout: 5000 }, async () => {
    let count = 0;
    const handle = scheduler.schedule(
      () => {
        count++;
      },
      { interval: 50 },
    );
    await new Promise((r) => setTimeout(r, 80));
    handle.cancel();
    const snapshot = count;
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(count, snapshot);
  });

  test('Scenario: Max runs auto-completes a schedule', { timeout: 5000 }, async () => {
    let count = 0;
    scheduler.schedule(
      () => {
        count++;
      },
      { interval: 30, maxRuns: 2 },
    );
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(count, 2);
  });

  test('Scenario: List all active schedules', () => {
    scheduler.schedule(() => {}, { interval: 1000 });
    scheduler.schedule(() => {}, { interval: 1000 });
    const list = scheduler.listSchedules();
    assert.ok(list.length >= 2);
    scheduler.destroy();
  });

  test('Scenario: Destroy cancels all schedules', { timeout: 5000 }, async () => {
    let count = 0;
    scheduler.schedule(
      () => {
        count++;
      },
      { interval: 50 },
    );
    scheduler.schedule(
      () => {
        count++;
      },
      { interval: 50 },
    );
    await new Promise((r) => setTimeout(r, 80));
    scheduler.destroy();
    const snapshot = count;
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(count, snapshot);
  });
});
