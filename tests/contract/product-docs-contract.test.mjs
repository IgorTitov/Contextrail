/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the PRD-USM-backlog planning layer keeps its canonical routing, persona storage, and intake-first source-of-truth split.
 * @sidecar product-docs-contract.test.mjs.header.md
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
const docsReadme = readFileSync(new URL('../../docs/README.md', import.meta.url), 'utf8');
const prd = readFileSync(new URL('../../docs/prd/index.md', import.meta.url), 'utf8');
const usm = readFileSync(new URL('../../docs/usm/index.md', import.meta.url), 'utf8');
const personas = readFileSync(
  new URL('../../docs/usm/personas/README.md', import.meta.url),
  'utf8',
);
const scenarios = readFileSync(
  new URL('../../docs/usm/scenarios/README.md', import.meta.url),
  'utf8',
);
const backlog = readFileSync(new URL('../../docs/backlog/index.md', import.meta.url), 'utf8');

test('package exposes the planning stop-gates', () => {
  assert.equal(pkg.scripts['product-docs-check'], 'node scripts/checks/product-docs-check.mjs');
  assert.equal(pkg.scripts['usm-check'], 'node scripts/checks/usm-check.mjs');
  assert.equal(pkg.scripts['pre-impl-gate'], 'node scripts/checks/pre-impl-gate.mjs');
});

test('canonical Claude instructions route intake and decomposition through product-planner', () => {
  for (const token of [
    'product-planner',
    'raw intake first',
    'Technical or non-functional work may move from intake to PRD without USM',
    'UX, UI, or behavior work must pass through persona and workflow USM',
    'docs/usm/personas/',
    'STOP. Before implementing any user-facing behavior change, route through `product-planner` and confirm USM coverage exists.',
  ]) {
    assert.ok(claude.includes(token));
  }
});

test('agent and skill indexes expose the product-doc planning surfaces', () => {
  assert.ok(agents.includes('`product-planner`'));
  assert.ok(skills.includes('`prd-usm-backlog`'));
});

test('docs index states the source-of-truth split and optional BPMN stance', () => {
  assert.ok(docsReadme.includes('PRD owns requirement intent'));
  assert.ok(docsReadme.includes('USM owns persona-centered workflows'));
  assert.ok(docsReadme.includes('Backlog owns intake, priority, ordering, and execution status'));
  assert.ok(docsReadme.includes('BPMN is optional'));
});

test('PRD, USM, personas, scenarios, and backlog docs agree on the canonical layout', () => {
  assert.ok(prd.includes('PRD is the source of truth for requirement intent'));
  assert.ok(usm.includes('Each significant workflow gets its own USM scenario map'));
  assert.ok(usm.includes('persona-template.md'));
  assert.ok(usm.includes('workflow-template.md'));
  assert.ok(personas.includes('docs/usm/personas/<persona-key>.md'));
  assert.ok(personas.includes('persona-template.md'));
  assert.ok(scenarios.includes('docs/usm/scenarios/<persona-key>/<workflow-key>.md'));
  assert.ok(
    backlog.includes('Every new request enters the backlog as raw intake at the bottom first.'),
  );
  assert.ok(backlog.includes('Ready for implementation'));
});
