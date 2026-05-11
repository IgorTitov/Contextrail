/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the implementation, frontend, and acceptance lanes plus the delivery-flow check agree across canonical repository surfaces.
 * @sidecar delivery-flow-coherence.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

/** Read a file plus its sidecar (if any) to capture metadata that may have moved. */
function readWithSidecar(rel) {
  const url = new URL(`../../${rel}`, import.meta.url);
  let text = readFileSync(url, 'utf8');
  const sidecarUrl = new URL(`../../${rel}.header.md`, import.meta.url);
  if (existsSync(sidecarUrl)) text += '\n' + readFileSync(sidecarUrl, 'utf8');
  return text;
}

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const preCommit = readFileSync(new URL('../../.githooks/pre-commit', import.meta.url), 'utf8');
const claude = readWithSidecar('.claude/CLAUDE.md');
const agents = readWithSidecar('.claude/agents/README.md');
const skills = readWithSidecar('.claude/skills/README.md');
const repoArchitect = readWithSidecar('.claude/agents/repo-architect.md');
const featureImplementer = readWithSidecar('.claude/agents/feature-implementer.md');
const frontendSpecialist = readWithSidecar('.claude/agents/frontend-specialist.md');
const acceptanceTester = readWithSidecar('.claude/agents/acceptance-tester.md');
const architecture = readWithSidecar('.claude/rules/architecture.md');
const development = readWithSidecar('.claude/rules/development.md');
const scriptsReadme = readWithSidecar('scripts/checks/README.md');

test('package exposes the delivery-flow drift check', () => {
  assert.equal(pkg.scripts['delivery-flow-check'], 'node scripts/checks/delivery-flow-check.mjs');
});

test('pre-commit runs the delivery-flow and slice-discipline checks', () => {
  assert.ok(preCommit.includes('node scripts/checks/pre-impl-gate.mjs'));
  assert.ok(preCommit.includes('node scripts/checks/delivery-flow-check.mjs'));
  assert.ok(preCommit.includes('node scripts/checks/changeset-size-check.mjs'));
});

test('canonical Claude instructions route the delivery lanes and bounded-reading rule', () => {
  for (const token of [
    'feature-implementer',
    'frontend-specialist',
    'acceptance-tester',
    'headers, public APIs, tests',
    'Deep-read implementation code mainly in files you will actually change',
    'One slice equals one commit',
    'pre-impl-gate.mjs',
  ]) {
    assert.ok(claude.includes(token), `expected .claude/CLAUDE.md to include ${token}`);
  }
});

test('agent and skill indexes expose the delivery layer', () => {
  assert.ok(agents.includes('`feature-implementer`'));
  assert.ok(agents.includes('`frontend-specialist`'));
  assert.ok(agents.includes('`acceptance-tester`'));
  assert.ok(skills.includes('`feature-delivery`'));
  assert.ok(skills.includes('`frontend-delivery`'));
  assert.ok(skills.includes('`acceptance-validation`'));
});

test('architect and delivery agents keep the bounded-reading rule explicit', () => {
  assert.ok(repoArchitect.includes('headers, public APIs, tests, and nearby docs'));
  assert.ok(repoArchitect.includes('weaker local model'));
  assert.ok(featureImplementer.includes('Deep-read the files you will actually change'));
  assert.ok(featureImplementer.includes('uses headers/public APIs/tests for untouched areas'));
  assert.ok(frontendSpecialist.includes('selectors'));
  assert.ok(frontendSpecialist.includes('accessibility'));
  assert.ok(acceptanceTester.includes('ready for finalization'));
});

test('rules and script docs describe the delivery-flow layer', () => {
  assert.ok(architecture.includes('Only deep-read implementation in files you are touching'));
  assert.ok(
    development.includes('For untouched areas, use headers, public APIs, tests, and nearby docs'),
  );
  assert.ok(scriptsReadme.includes('delivery-flow-check.mjs'));
});
