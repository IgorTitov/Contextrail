/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the typed error hierarchy exists, is importable, and is adopted by at least two repo scripts.
 * @sidecar script-errors-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('scripts/lib/errors.mjs exists and exports the expected hierarchy', async () => {
  const modPath = new URL('../../scripts/lib/errors.mjs', import.meta.url);
  assert.ok(existsSync(modPath), 'scripts/lib/errors.mjs must exist');

  const mod = await import(modPath);
  for (const name of [
    'ScriptError',
    'ValidationError',
    'FileNotFoundError',
    'ParseError',
    'SchemaError',
  ]) {
    assert.equal(typeof mod[name], 'function', `${name} must be exported`);
  }
});

test('at least sixteen scripts import from the typed error hierarchy', () => {
  const scripts = [
    'scripts/checks/readme-check.mjs',
    'scripts/checks/architecture-check.mjs',
    'scripts/checks/header-check.mjs',
    'scripts/checks/header-create.mjs',
    'scripts/checks/control-plane-check.mjs',
    'scripts/checks/delivery-flow-check.mjs',
    'scripts/checks/product-docs-check.mjs',
    'scripts/checks/design-docs-check.mjs',
    'scripts/checks/spec-check.mjs',
    'scripts/checks/pre-impl-gate.mjs',
    'scripts/checks/usm-check.mjs',
    'scripts/checks/changeset-size-check.mjs',
    'scripts/checks/test-gate.mjs',
    'scripts/checks/backlog-sync.mjs',
    'scripts/checks/spec-sync.mjs',
    'scripts/checks/changelog-sync.mjs',
  ];

  for (const scriptPath of scripts) {
    const fullPath = new URL(`../../${scriptPath}`, import.meta.url);
    const source = readFileSync(fullPath, 'utf8');
    assert.ok(
      source.includes("from '../lib/errors.mjs'"),
      `${scriptPath} must import from the typed error hierarchy`,
    );
  }
});

test('result() in output.mjs supports typed error serialization', () => {
  const source = readFileSync(new URL('../../scripts/lib/output.mjs', import.meta.url), 'utf8');
  assert.ok(
    source.includes('toJSON'),
    'output.mjs result() must handle toJSON for typed error serialization',
  );
});
