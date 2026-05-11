/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the pure helper functions exported by scripts/lib/trace-helpers.mjs.
 * @sidecar trace-helpers.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBddRef } from '../../scripts/lib/trace-helpers.mjs';

// --- parseBddRef() ---

test('parseBddRef() returns empty file and scenario for empty input', () => {
  assert.deepStrictEqual(parseBddRef(''), { file: '', scenario: '' });
  assert.deepStrictEqual(parseBddRef(null), { file: '', scenario: '' });
  assert.deepStrictEqual(parseBddRef(undefined), { file: '', scenario: '' });
});

test('parseBddRef() extracts file path without anchor', () => {
  const result = parseBddRef('tests/bdd/features/login.feature');
  assert.equal(result.file, 'tests/bdd/features/login.feature');
  assert.equal(result.scenario, '');
});

test('parseBddRef() extracts file and scenario from anchor', () => {
  const result = parseBddRef('tests/bdd/features/login.feature#Scenario: user logs in');
  assert.equal(result.file, 'tests/bdd/features/login.feature');
  assert.equal(result.scenario, 'user logs in');
});

test('parseBddRef() strips Scenario Outline: prefix from anchor', () => {
  const result = parseBddRef(
    'tests/bdd/features/auth.feature#Scenario Outline: parameterized login',
  );
  assert.equal(result.file, 'tests/bdd/features/auth.feature');
  assert.equal(result.scenario, 'parameterized login');
});

test('parseBddRef() handles anchor without Scenario prefix', () => {
  const result = parseBddRef('tests/bdd/features/auth.feature#plain anchor text');
  assert.equal(result.file, 'tests/bdd/features/auth.feature');
  assert.equal(result.scenario, 'plain anchor text');
});

test('parseBddRef() trims whitespace from file and anchor', () => {
  const result = parseBddRef('  tests/bdd/foo.feature # Scenario:  spaced  ');
  assert.equal(result.file, 'tests/bdd/foo.feature');
  assert.equal(result.scenario, 'spaced');
});
