/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the bounded selector-registry rule and i18n copy rule stay explicit across the canonical architecture, development, frontend, and design-system surfaces.
 * @sidecar ui-selector-registry-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const claude = readFileSync(new URL('../../.claude/CLAUDE.md', import.meta.url), 'utf8');
const architecture = readFileSync(
  new URL('../../.claude/rules/architecture.md', import.meta.url),
  'utf8',
);
const development = readFileSync(
  new URL('../../.claude/rules/development.md', import.meta.url),
  'utf8',
);
const frontendAgent = readFileSync(
  new URL('../../.claude/agents/frontend-specialist.md', import.meta.url),
  'utf8',
);
const frontendSkill = readFileSync(
  new URL('../../.claude/skills/frontend-delivery/SKILL.md', import.meta.url),
  'utf8',
);
const designSystem = readFileSync(
  new URL('../../docs/design/design-system.md', import.meta.url),
  'utf8',
);

test('canonical Claude instructions keep the bounded selector-registry rule explicit', () => {
  assert.ok(claude.includes('Automation-facing DOM hooks'));
  assert.ok(claude.includes('bounded registry'));
});

test('architecture and development rules keep registry-backed selector wording explicit', () => {
  assert.ok(architecture.includes('bounded UI registry'));
  assert.ok(architecture.includes('hardcoded literals'));
  assert.ok(development.includes('bounded registry'));
  assert.ok(development.includes('hardcoding the same hooks independently'));
});

test('frontend agent, skill, and design-system docs agree on the registry contract', () => {
  assert.ok(frontendAgent.includes('bounded registry'));
  assert.ok(
    frontendSkill.includes('Stable automation-facing hooks must come from a bounded registry'),
  );
  assert.ok(designSystem.includes('Selector and test-id registry rule'));
  assert.ok(designSystem.includes('giant app-wide registry'));
});

test('a concrete selector registry module exists and is importable', async () => {
  const registryPath = new URL('../../apps/starter/ui-selectors.mjs', import.meta.url);
  assert.ok(existsSync(registryPath), 'apps/starter/ui-selectors.mjs must exist');

  const mod = await import(registryPath);
  assert.ok(mod.bootstrap, 'registry must export a bootstrap namespace');
  assert.equal(
    typeof mod.bootstrap.statusBadge,
    'string',
    'bootstrap.statusBadge must be a string',
  );
});

test('E2E spec imports selectors from the registry instead of hardcoding them', () => {
  const specSource = readFileSync(
    new URL('../e2e/template-bootstrap.spec.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(
    specSource.includes("from '../../apps/starter/ui-selectors.mjs'"),
    'E2E spec must import from the selector registry',
  );
  assert.ok(
    specSource.includes('bootstrap.statusBadge'),
    'E2E spec must use bootstrap.statusBadge from the registry',
  );
});

test('contract keeps the i18n/messages-layer rule explicit across canonical surfaces', () => {
  for (const source of [
    claude,
    architecture,
    development,
    frontendAgent,
    frontendSkill,
    designSystem,
  ]) {
    assert.match(source, /i18n\/messages layer|i18n\/messages-layer|i18n\/messages/);
  }
});
