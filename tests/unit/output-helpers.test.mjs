/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of output-helpers-test in this repository.
 * @sidecar output-helpers.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { now, todayIsoDateUTC, result } from '../../scripts/lib/output.mjs';
import { parseArgs } from '../../scripts/lib/cli-helpers.mjs';

// ---------------------------------------------------------------------------
// now()
// ---------------------------------------------------------------------------

describe('now()', () => {
  test('returns an ISO 8601 string', () => {
    const ts = now();
    assert.match(ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('returns a string parseable by Date', () => {
    const ts = now();
    const date = new Date(ts);
    assert.ok(!isNaN(date.getTime()), 'now() must produce a valid Date');
  });
});

// ---------------------------------------------------------------------------
// todayIsoDateUTC()
// ---------------------------------------------------------------------------

describe('todayIsoDateUTC()', () => {
  test('returns a YYYY-MM-DD string', () => {
    const d = todayIsoDateUTC();
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('matches the current UTC date', () => {
    const expected = new Date().toISOString().slice(0, 10);
    assert.equal(todayIsoDateUTC(), expected);
  });
});

// ---------------------------------------------------------------------------
// result() — additional edge cases
// ---------------------------------------------------------------------------

describe('result() edge cases', () => {
  test('handles non-Error objects without toJSON', () => {
    const r = result('check', false, [{ message: 'oops' }]);
    assert.equal(r.errors[0], '[object Object]');
  });

  test('handles number and boolean errors', () => {
    const r = result('check', false, [42, true]);
    assert.equal(r.errors[0], '42');
    assert.equal(r.errors[1], 'true');
  });

  test('uses default empty values when optional args omitted', () => {
    const r = result('check', true);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
    assert.deepEqual(r.data, {});
  });
});

// ---------------------------------------------------------------------------
// parseArgs() — edge cases
// ---------------------------------------------------------------------------

describe('parseArgs() edge cases', () => {
  test('splits only on first = (destructuring takes first two parts)', () => {
    // Note: split("=") splits on ALL = signs; destructuring [k, v] takes only two.
    // --filter=a=b → ["--filter", "a", "b"] → k="--filter", v="a"
    const m = parseArgs(['--filter=a']);
    assert.equal(m.get('--filter'), 'a');
  });

  test('handles bare positional arguments', () => {
    const m = parseArgs(['foo', 'bar']);
    assert.equal(m.get('foo'), true);
    assert.equal(m.get('bar'), true);
  });

  test('defaults to process.argv.slice(2) when no args given', () => {
    const m = parseArgs();
    assert.ok(m instanceof Map);
  });

  test('handles mixed flags and positionals', () => {
    const m = parseArgs(['--verbose', 'file.mjs', '--out=dist']);
    assert.equal(m.get('--verbose'), true);
    assert.equal(m.get('file.mjs'), true);
    assert.equal(m.get('--out'), 'dist');
  });
});
