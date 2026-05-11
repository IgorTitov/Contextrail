/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that header-check warning signal stays focused on header quality issues and does not flood the repo with generic traceability emptiness warnings.
 * @sidecar header-warning-signal.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateHeader } from '../../scripts/checks/_shared.mjs';

function read(rel) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
}

test('README header does not emit generic SpecRefs or UsmRefs warning noise', () => {
  const checked = validateHeader('README.md', read('README.md'));
  assert.ok(
    checked.warnings.every((warning) => !warning.includes('SpecRefs is _none_')),
    'did not expect generic SpecRefs warning noise for README.md',
  );
  assert.ok(
    checked.warnings.every((warning) => !warning.includes('UsmRefs is _none_')),
    'did not expect generic UsmRefs warning noise for README.md',
  );
});

test('VERSION sidecar no longer warns that Tests is _none_', () => {
  const checked = validateHeader('VERSION.header.md', read('VERSION.header.md'), {
    isSidecar: true,
  });
  assert.ok(
    checked.warnings.every((warning) => !warning.includes('Tests field is still _none_')),
    'did not expect VERSION.header.md to keep a placeholder Tests field',
  );
});
