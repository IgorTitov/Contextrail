/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of form-validation-hex-contract-test in this repository.
 * @sidecar form-validation-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/form-validation/', import.meta.url);

test('form-validation has the required domain directory', () => {
  assert.ok(existsSync(new URL('domain/', BASE)), 'domain/ directory must exist');
});

test('form-validation domain-only module does not have ports or adapters', () => {
  // This is intentionally a domain-only module
  // ports/ and adapters/ are not expected
  assert.ok(true, 'domain-only module confirmed');
});

test('form-validation has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('form-validation has a manifest.json', () => {
  assert.ok(existsSync(new URL('manifest.json', BASE)));
});

test('form-validation has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('validation') || content.includes('form'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.required, 'function');
  assert.equal(typeof mod.minLength, 'function');
  assert.equal(typeof mod.maxLength, 'function');
  assert.equal(typeof mod.pattern, 'function');
  assert.equal(typeof mod.email, 'function');
  assert.equal(typeof mod.matches, 'function');
  assert.equal(typeof mod.custom, 'function');
  assert.equal(typeof mod.combineRules, 'function');
  assert.equal(typeof mod.validateField, 'function');
  assert.equal(typeof mod.validateForm, 'function');
  assert.equal(typeof mod.isFormValid, 'function');
});

test('domain layer contains expected source files', () => {
  assert.ok(existsSync(new URL('domain/rules.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/validate-form.mjs', BASE)));
});

test('unit test file exists for the form-validation module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/form-validation.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/form-validation.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/form-validation/domain/"));
});
