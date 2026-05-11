/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the implementation, frontend, and acceptance-lane contracts keep their canonical role split and bounded-reading conventions stable.
 * @sidecar delivery-agents-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const claude = readFileSync(new URL('../../.claude/CLAUDE.md', import.meta.url), 'utf8');
const agents = readFileSync(new URL('../../.claude/agents/README.md', import.meta.url), 'utf8');
const skills = readFileSync(new URL('../../.claude/skills/README.md', import.meta.url), 'utf8');
const architecture = readFileSync(
  new URL('../../.claude/rules/architecture.md', import.meta.url),
  'utf8',
);
const development = readFileSync(
  new URL('../../.claude/rules/development.md', import.meta.url),
  'utf8',
);

test('package exposes the delivery-flow drift check', () => {
  assert.equal(pkg.scripts['delivery-flow-check'], 'node scripts/checks/delivery-flow-check.mjs');
});

test('canonical Claude instructions route the delivery agents and bounded-reading rule', () => {
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

test('architecture and development rules keep bounded-reading wording explicit', () => {
  assert.ok(architecture.includes('Only deep-read implementation in files you are touching'));
  assert.ok(architecture.includes('Use headers, public APIs, tests, and nearby docs'));
  assert.ok(development.includes('Deep-read the files you will actually change'));
  assert.ok(
    development.includes('For untouched areas, use headers, public APIs, tests, and nearby docs'),
  );
});
