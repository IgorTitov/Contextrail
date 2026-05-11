/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the canonical agent contract, AGENTS adapter, Codex skills, and the Claude adapter stay aligned.
 * @sidecar agent-adapter-consistency.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const contract = JSON.parse(
  readFileSync(
    new URL('../../docs/agent-contract/compatibility-contract.json', import.meta.url),
    'utf8',
  ),
);
const docsReadme = readFileSync(
  new URL('../../docs/agent-contract/README.md', import.meta.url),
  'utf8',
);
const agents = readFileSync(new URL('../../AGENTS.md', import.meta.url), 'utf8');
const claude = readFileSync(new URL('../../.claude/CLAUDE.md', import.meta.url), 'utf8');
const codexSkills = readFileSync(
  new URL('../../.agents/skills/README.md', import.meta.url),
  'utf8',
);

function hasFile(rel) {
  return existsSync(new URL(`../../${rel}`, import.meta.url));
}

test('package exposes compatibility sync and check scripts', () => {
  assert.equal(pkg.scripts['agent-contract:sync'], 'node scripts/agent-contract/sync.mjs');
  assert.equal(pkg.scripts['agent-contract:check'], 'node scripts/agent-contract/check.mjs');
});

test('canonical docs declare the shared source of truth clearly', () => {
  assert.ok(docsReadme.includes('compatibility-contract.json'));
  assert.ok(docsReadme.includes('Canonical machine source'));
  assert.ok(docsReadme.includes('AGENTS.md'));
  assert.ok(docsReadme.includes('.claude/CLAUDE.md'));
});

test('AGENTS and Claude adapter both point at the same canonical contract', () => {
  assert.ok(agents.includes(contract.sourceOfTruth.machine));
  assert.ok(claude.includes(contract.sourceOfTruth.machine));
  assert.ok(agents.includes('atomic'));
  assert.ok(agents.includes('acceptance'));
  assert.ok(agents.includes('CHANGELOG.md'));
});

test('generated Codex skill roster matches the canonical skill map and existing Claude skills', () => {
  for (const skill of contract.skills) {
    assert.ok(
      codexSkills.includes(`\`${skill.name}\``),
      `expected Codex skills README to list ${skill.name}`,
    );
    assert.ok(
      hasFile(`.agents/skills/${skill.name}/SKILL.md`),
      `expected generated Codex skill file for ${skill.name}`,
    );
    assert.ok(hasFile(skill.claudeSkill), `expected existing Claude skill file for ${skill.name}`);
  }
});

test('schemaVersion is at least 2 and agentProfiles is well-formed', () => {
  assert.ok(
    typeof contract.schemaVersion === 'number' && contract.schemaVersion >= 2,
    `expected schemaVersion >= 2, got ${contract.schemaVersion}`,
  );
  assert.ok(Array.isArray(contract.agentProfiles), 'agentProfiles[] must be an array');
  const expectedNames = ['frontier', 'mid', 'small'];
  const seen = new Set();
  for (const profile of contract.agentProfiles) {
    assert.ok(
      expectedNames.includes(profile.name),
      `agentProfiles[].name must be one of ${expectedNames.join('|')} (got: ${profile.name})`,
    );
    assert.ok(!seen.has(profile.name), `agentProfiles[].name duplicates: ${profile.name}`);
    seen.add(profile.name);
    assert.ok(
      typeof profile.minContextTokens === 'number' && profile.minContextTokens > 0,
      `agentProfiles[${profile.name}].minContextTokens must be a positive number`,
    );
    assert.ok(
      Array.isArray(profile.capabilities) && profile.capabilities.length > 0,
      `agentProfiles[${profile.name}].capabilities must be non-empty`,
    );
    assert.ok(
      Array.isArray(profile.harnessExamples),
      `agentProfiles[${profile.name}].harnessExamples must be an array`,
    );
  }
  for (const expected of expectedNames) {
    assert.ok(seen.has(expected), `agentProfiles is missing expected entry: ${expected}`);
  }
});

test('every role declares a capabilityTier from the allowed set', () => {
  const allowed = new Set(['frontier', 'mid', 'small', 'any']);
  for (const role of contract.roles) {
    assert.ok(
      allowed.has(role.capabilityTier),
      `role ${role.name} has invalid capabilityTier: ${JSON.stringify(role.capabilityTier)}`,
    );
  }
});

test('every skill declares a capabilityTier from the allowed set', () => {
  const allowed = new Set(['frontier', 'mid', 'small', 'any']);
  for (const skill of contract.skills) {
    assert.ok(
      allowed.has(skill.capabilityTier),
      `skill ${skill.name} has invalid capabilityTier: ${JSON.stringify(skill.capabilityTier)}`,
    );
  }
});

test('local adapter slot is reserved in adapters', () => {
  assert.ok(contract.adapters?.local, 'adapters.local slot must be reserved');
  assert.equal(contract.adapters.local.root, 'LOCAL.md');
  assert.equal(contract.adapters.local.microRoot, 'MICRO.md');
});
