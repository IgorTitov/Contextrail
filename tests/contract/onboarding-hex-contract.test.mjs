/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify onboarding module conforms to hex architecture contract (folder structure, barrel export, manifest, README, no deep imports).
 * @sidecar onboarding-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/onboarding/', import.meta.url);

test('onboarding has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('onboarding has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('onboarding has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'onboarding');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('onboarding has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('onboarding') || content.includes('tour'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  // Domain
  assert.equal(typeof mod.createTourStep, 'function');
  assert.equal(typeof mod.isValidStep, 'function');
  assert.equal(typeof mod.createTourState, 'function');
  assert.equal(typeof mod.startTour, 'function');
  assert.equal(typeof mod.nextStep, 'function');
  assert.equal(typeof mod.previousStep, 'function');
  assert.equal(typeof mod.endTour, 'function');
  assert.equal(typeof mod.getCurrentStep, 'function');
  assert.equal(typeof mod.canAdvance, 'function');
  assert.equal(typeof mod.canGoBack, 'function');
  assert.equal(typeof mod.isFirstStep, 'function');
  assert.equal(typeof mod.isLastStep, 'function');
  // Ports
  assert.equal(typeof mod.assertOnboardingPort, 'function');
  // Adapters
  assert.equal(typeof mod.createMemoryOnboardingAdapter, 'function');
  assert.equal(typeof mod.createDomOnboardingAdapter, 'function');
  // Messages
  assert.equal(typeof mod.t, 'function');
  assert.equal(typeof mod.setLocale, 'function');
  assert.equal(typeof mod.getLocale, 'function');
  assert.equal(typeof mod.registerLocale, 'function');
  assert.equal(typeof mod.resetLocale, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/tour-step.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/tour-state.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/onboarding-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/dom-adapter.mjs', BASE)));
});

test('unit test file exists for the onboarding module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/onboarding.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/onboarding.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/onboarding/domain/"));
  assert.ok(!content.includes("from '../../modules/onboarding/ports/"));
  assert.ok(!content.includes("from '../../modules/onboarding/adapters/"));
});

test('messages.mjs exists with i18n strings', () => {
  assert.ok(existsSync(new URL('messages.mjs', BASE)));
});
