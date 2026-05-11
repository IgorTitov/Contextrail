/* @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Prove that the new control-plane architect, supervisor, product-planner routing, drift-check scripts, architecture rules, trunk-bba skill, and delivery-model ADR agree with the canonical repo surfaces.
 * @sidecar control-plane-coherence.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// @test-isolation: live-repo-allowed | reason: Read-only coherence check; uses new URL('../../.claims/README.md', import.meta.url) only to assert the .claims/ directory and its README exist in the live repo — no writes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const preCommit = readFileSync(new URL('../../.githooks/pre-commit', import.meta.url), 'utf8');
const claude = readFileSync(new URL('../../.claude/CLAUDE.md', import.meta.url), 'utf8');
const architectureRule = readFileSync(
  new URL('../../.claude/rules/architecture.md', import.meta.url),
  'utf8',
);
const agents = readFileSync(new URL('../../.claude/agents/README.md', import.meta.url), 'utf8');
const skills = readFileSync(new URL('../../.claude/skills/README.md', import.meta.url), 'utf8');
const trunkBba = readFileSync(
  new URL('../../.claude/skills/trunk-bba/SKILL.md', import.meta.url),
  'utf8',
);
const scriptsReadme = readFileSync(
  new URL('../../scripts/checks/README.md', import.meta.url),
  'utf8',
);
const adr = readFileSync(
  new URL('../../docs/adr/0002-trunk-based-delivery.md', import.meta.url),
  'utf8',
);
const integrationReadme = readFileSync(new URL('./README.md', import.meta.url), 'utf8');

test('package exposes the control-plane drift check', () => {
  assert.equal(pkg.scripts['control-plane-check'], 'node scripts/checks/control-plane-check.mjs');
  assert.equal(pkg.scripts['product-docs-check'], 'node scripts/checks/product-docs-check.mjs');
});

test('pre-commit runs the control-plane drift check', () => {
  assert.ok(preCommit.includes('node scripts/checks/control-plane-check.mjs'));
  assert.ok(preCommit.includes('node scripts/checks/product-docs-check.mjs'));
});

test('canonical Claude instructions route the architect and supervisor roles and summarize trunk/BBA', () => {
  for (const token of [
    'repo-architect',
    'control-plane-supervisor',
    'product-planner',
    'Trunk-Based Development',
    'Branch by Abstraction',
    'disabled by default',
  ]) {
    assert.ok(claude.includes(token), `expected .claude/CLAUDE.md to include ${token}`);
  }
});

test('architecture rule keeps SOLID-style and LLM-friendly wording explicit', () => {
  assert.ok(architectureRule.includes('SOLID-style'));
  assert.ok(architectureRule.includes('LLM-friendly'));
});

test('agent and skill indexes expose the new control-plane surfaces', () => {
  assert.ok(agents.includes('`repo-architect`'));
  assert.ok(agents.includes('`control-plane-supervisor`'));
  assert.ok(agents.includes('`product-planner`'));
  assert.ok(skills.includes('`control-plane-design`'));
  assert.ok(skills.includes('`control-plane-audit`'));
  assert.ok(skills.includes('`trunk-bba`'));
  assert.ok(skills.includes('`prd-usm-backlog`'));
});

test('trunk-bba skill documents atomic slices and temporary-seam coordination', () => {
  for (const token of [
    'independently reviewable product or repository slice',
    'disabled by default',
    'scope',
    'owner',
    'cleanup trigger',
  ]) {
    assert.ok(trunkBba.includes(token));
  }
});

test('script and ADR docs describe the new drift and delivery model', () => {
  assert.ok(scriptsReadme.includes('control-plane-check.mjs'));
  assert.ok(scriptsReadme.includes('product-docs-check.mjs'));
  assert.ok(adr.includes('Branch by Abstraction'));
  assert.ok(adr.includes('.backups/'));
  assert.ok(adr.includes('mergezip'));
  assert.ok(adr.includes('post-commit'));
  assert.ok(adr.includes('cleanup trigger'));
});

test('integration README exposes the new control-plane coherence proof', () => {
  assert.ok(integrationReadme.includes('control-plane-coherence.test.mjs'));
});

// --- Inter-agent coordination protocol (ADR 0008) ---

test('claim-check script exists and is registered in package.json', () => {
  assert.ok(
    existsSync(new URL('../../scripts/checks/claim-check.mjs', import.meta.url)),
    'scripts/checks/claim-check.mjs must exist',
  );
  assert.equal(pkg.scripts['claim-check'], 'node scripts/checks/claim-check.mjs');
});

test('.claims/ directory and README exist', () => {
  assert.ok(
    existsSync(new URL('../../.claims/README.md', import.meta.url)),
    '.claims/README.md must exist',
  );
});

test('pre-commit hook runs claim-check auto-expire and enforce', () => {
  assert.ok(preCommit.includes('claim-check'), 'pre-commit must reference claim-check');
  assert.ok(preCommit.includes('--auto-expire'), 'pre-commit must run --auto-expire');
  assert.ok(preCommit.includes('--enforce'), 'pre-commit must run --enforce');
});

test('ADR 0008 exists and is referenced in Claude instructions', () => {
  assert.ok(
    existsSync(
      new URL('../../docs/adr/0008-inter-agent-coordination-protocol.md', import.meta.url),
    ),
    'ADR 0008 must exist',
  );
  assert.ok(claude.includes('.claims/'), '.claude/CLAUDE.md must reference .claims/');
  assert.ok(claude.includes('claim-check'), '.claude/CLAUDE.md must reference claim-check');
});
