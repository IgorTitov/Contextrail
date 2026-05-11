/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for coa-recover.mjs pure helpers (detectVersionDrift, findStaleClaims, diagnose).
 * @sidecar coa-recover.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectVersionDrift,
} from '../../scripts/coa-recover.mjs';

describe('coa-recover: detectVersionDrift', () => {
  test('no drift when valid patch bump', () => {
    const result = detectVersionDrift('0.7.1', '0.7.0');
    assert.equal(result.drifted, false);
  });

  test('no drift when valid minor bump', () => {
    const result = detectVersionDrift('0.8.0', '0.7.5');
    assert.equal(result.drifted, false);
  });

  test('no drift when valid major bump', () => {
    const result = detectVersionDrift('1.0.0', '0.7.5');
    assert.equal(result.drifted, false);
  });

  test('detects drift on +2 patch jump', () => {
    const result = detectVersionDrift('0.7.2', '0.7.0');
    assert.equal(result.drifted, true);
    assert.ok(result.reason.includes('drift'));
  });

  test('detects drift on backward version', () => {
    const result = detectVersionDrift('0.6.0', '0.7.0');
    assert.equal(result.drifted, true);
  });

  test('no drift when versions match (not bumped)', () => {
    const result = detectVersionDrift('0.7.0', '0.7.0');
    assert.equal(result.drifted, false);
    assert.ok(result.reason.includes('not bumped'));
  });

  test('handles null versions gracefully', () => {
    const result = detectVersionDrift(null, '0.7.0');
    assert.equal(result.drifted, false);
  });
});
