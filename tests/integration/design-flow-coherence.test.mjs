/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the design lane, design-docs-check script, and selector-registry policy agree across canonical repository surfaces.
 * @sidecar design-flow-coherence.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const preCommit = readFileSync(new URL('../../.githooks/pre-commit', import.meta.url), 'utf8');
const claude = readFileSync(new URL('../../.claude/CLAUDE.md', import.meta.url), 'utf8');
const agents = readFileSync(new URL('../../.claude/agents/README.md', import.meta.url), 'utf8');
const skills = readFileSync(new URL('../../.claude/skills/README.md', import.meta.url), 'utf8');
const designer = readFileSync(new URL('../../.claude/agents/designer.md', import.meta.url), 'utf8');
const productPlanner = readFileSync(
  new URL('../../.claude/agents/product-planner.md', import.meta.url),
  'utf8',
);
const frontendSpecialist = readFileSync(
  new URL('../../.claude/agents/frontend-specialist.md', import.meta.url),
  'utf8',
);
const architecture = readFileSync(
  new URL('../../.claude/rules/architecture.md', import.meta.url),
  'utf8',
);
const development = readFileSync(
  new URL('../../.claude/rules/development.md', import.meta.url),
  'utf8',
);
const docsReadme = readFileSync(new URL('../../docs/README.md', import.meta.url), 'utf8');
const designReadme = readFileSync(new URL('../../docs/design/README.md', import.meta.url), 'utf8');
const designSystem = readFileSync(
  new URL('../../docs/design/design-system.md', import.meta.url),
  'utf8',
);
const scriptsReadme = readFileSync(
  new URL('../../scripts/checks/README.md', import.meta.url),
  'utf8',
);

test('package exposes the design-docs drift check', () => {
  assert.equal(pkg.scripts['design-docs-check'], 'node scripts/checks/design-docs-check.mjs');
});

test('pre-commit runs the design-docs drift check', () => {
  assert.ok(preCommit.includes('node scripts/checks/design-docs-check.mjs'));
});

test('canonical Claude instructions route the design lane and selector-registry rule', () => {
  for (const token of [
    'designer',
    'docs/design/',
    'Automation-facing DOM hooks',
    'bounded registry',
  ]) {
    assert.ok(claude.includes(token), `expected .claude/CLAUDE.md to include ${token}`);
  }
});

test('agent and skill indexes expose the design layer', () => {
  assert.ok(agents.includes('`designer`'));
  assert.ok(skills.includes('`design-delivery`'));
});

test('design and frontend surfaces keep routing and registry wording explicit', () => {
  assert.ok(designer.includes('brandbook'));
  assert.ok(designer.includes('mockup prompts'));
  assert.ok(productPlanner.includes('route through `designer`'));
  assert.ok(frontendSpecialist.includes('bounded registry'));
  assert.ok(architecture.includes('bounded UI registry'));
  assert.ok(development.includes('bounded registry'));
});

test('docs and script readmes describe the design layer', () => {
  assert.ok(docsReadme.includes('`design/`'));
  assert.ok(designReadme.includes('brandbook.md'));
  assert.ok(designSystem.includes('Selector and test-id registry rule'));
  assert.ok(scriptsReadme.includes('design-docs-check.mjs'));
});
