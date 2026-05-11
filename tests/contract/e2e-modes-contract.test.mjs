/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the template supports multiple E2E execution modes through env vars and launcher flags.
 * @sidecar e2e-modes-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('playwright.config.mjs reads HEADED and E2E_SLOWMO env vars', () => {
  const source = readFileSync(new URL('../../playwright.config.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes('HEADED'), 'config must reference HEADED env var');
  assert.ok(source.includes('E2E_SLOWMO'), 'config must reference E2E_SLOWMO env var');
  assert.ok(source.includes('slowMo'), 'config must wire slowMo launch option');
});

test('run-e2e.mjs supports --headed, --demo, and --slowmo flags', () => {
  const source = readFileSync(new URL('../../scripts/checks/run-e2e.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes("'--headed'"), 'launcher must support --headed flag');
  assert.ok(source.includes("'--demo'"), 'launcher must support --demo flag');
  assert.ok(source.includes("'--slowmo'"), 'launcher must support --slowmo flag');
});

test('package.json includes e2e:demo script', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.scripts['e2e:demo'], 'e2e:demo script must exist');
  assert.ok(pkg.scripts['e2e:demo'].includes('--demo'), 'e2e:demo script must pass --demo flag');
});
