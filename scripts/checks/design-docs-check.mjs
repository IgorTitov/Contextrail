/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate agreement across canonical design-lane files, design-doc discovery, and the bounded selector-registry rule that user-visible work depends on.
 * @sidecar design-docs-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../lib/errors.mjs';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const wantJson = args.has('--json');

const errors = [];

function abs(relPath) {
  return path.resolve(ROOT, relPath);
}

async function readText(relPath) {
  return readFile(abs(relPath), 'utf8');
}

async function readJson(relPath) {
  return JSON.parse(await readText(relPath));
}

function fail(message) {
  errors.push(new ValidationError(message));
}

function expectIncludes(text, needle, ownerLabel) {
  if (!text.includes(needle)) {
    fail(`${ownerLabel} is missing required text: ${needle}`);
  }
}

function extractBacktickBullets(text) {
  const values = [];
  const re = /^\s*-\s+`([^`]+)`/gm;
  let match;
  while ((match = re.exec(text))) values.push(match[1]);
  return values;
}

async function main() {
  const [
    pkg,
    claude,
    agentsReadme,
    skillsReadme,
    designer,
    productPlanner,
    frontendSpecialist,
    architectureRule,
    developmentRule,
    docsReadme,
    designReadme,
    brandbook,
    designSystem,
    promptsReadme,
    assetsReadme,
    scriptsReadme,
    preCommit,
    integrationReadme,
    contractReadme,
  ] = await Promise.all([
    readJson('package.json'),
    readText('.claude/CLAUDE.md'),
    readText('.claude/agents/README.md'),
    readText('.claude/skills/README.md'),
    readText('.claude/agents/designer.md'),
    readText('.claude/agents/product-planner.md'),
    readText('.claude/agents/frontend-specialist.md'),
    readText('.claude/rules/architecture.md'),
    readText('.claude/rules/development.md'),
    readText('docs/README.md'),
    readText('docs/design/README.md'),
    readText('docs/design/brandbook.md'),
    readText('docs/design/design-system.md'),
    readText('docs/design/prompts/README.md'),
    readText('docs/design/assets/README.md'),
    readText('scripts/checks/README.md'),
    readText('.githooks/pre-commit'),
    readText('tests/integration/README.md'),
    readText('tests/contract/README.md'),
  ]);

  if (pkg.scripts['design-docs-check'] !== 'node scripts/checks/design-docs-check.mjs') {
    fail('package.json is missing the canonical design-docs-check script');
  }

  for (const needle of [
    'designer',
    'docs/design/',
    'design-docs-check.mjs',
    'Automation-facing DOM hooks',
    'bounded registry',
  ]) {
    expectIncludes(claude, needle, '.claude/CLAUDE.md');
  }

  const agentNames = new Set(extractBacktickBullets(agentsReadme));
  if (!agentNames.has('designer')) {
    fail('.claude/agents/README.md is missing listed agent: designer');
  }

  const skillNames = new Set(extractBacktickBullets(skillsReadme));
  if (!skillNames.has('design-delivery')) {
    fail('.claude/skills/README.md is missing listed skill: design-delivery');
  }

  expectIncludes(designer, 'brandbook', '.claude/agents/designer.md');
  expectIncludes(designer, 'mockup prompts', '.claude/agents/designer.md');
  expectIncludes(productPlanner, 'route through `designer`', '.claude/agents/product-planner.md');
  expectIncludes(frontendSpecialist, 'bounded registry', '.claude/agents/frontend-specialist.md');
  expectIncludes(architectureRule, 'bounded UI registry', '.claude/rules/architecture.md');
  expectIncludes(developmentRule, 'bounded registry', '.claude/rules/development.md');

  expectIncludes(docsReadme, '`design/`', 'docs/README.md');
  expectIncludes(designReadme, 'brandbook.md', 'docs/design/README.md');
  expectIncludes(designReadme, 'design-system.md', 'docs/design/README.md');
  expectIncludes(designReadme, 'prompts/', 'docs/design/README.md');
  expectIncludes(brandbook, '# Brandbook', 'docs/design/brandbook.md');
  expectIncludes(
    designSystem,
    'Selector and test-id registry rule',
    'docs/design/design-system.md',
  );
  expectIncludes(promptsReadme, 'gemini-nano-banana.md', 'docs/design/prompts/README.md');
  expectIncludes(promptsReadme, 'google-stitch.md', 'docs/design/prompts/README.md');
  expectIncludes(assetsReadme, '# assets', 'docs/design/assets/README.md');

  expectIncludes(scriptsReadme, 'design-docs-check.mjs', 'scripts/checks/README.md');
  expectIncludes(preCommit, 'node scripts/checks/design-docs-check.mjs', '.githooks/pre-commit');
  expectIncludes(
    integrationReadme,
    'design-flow-coherence.test.mjs',
    'tests/integration/README.md',
  );
  expectIncludes(
    contractReadme,
    'ui-selector-registry-contract.test.mjs',
    'tests/contract/README.md',
  );

  const output = {
    script: 'design-docs-check',
    ok: errors.length === 0,
    errors: errors.map((e) => (e && typeof e.toJSON === 'function' ? e.toJSON() : String(e))),
    checked: [
      'package.json',
      '.claude/CLAUDE.md',
      '.claude/agents/README.md',
      '.claude/skills/README.md',
      '.claude/agents/designer.md',
      '.claude/agents/product-planner.md',
      '.claude/agents/frontend-specialist.md',
      '.claude/rules/architecture.md',
      '.claude/rules/development.md',
      'docs/README.md',
      'docs/design/README.md',
      'docs/design/brandbook.md',
      'docs/design/design-system.md',
      'docs/design/prompts/README.md',
      'docs/design/assets/README.md',
      'scripts/checks/README.md',
      '.githooks/pre-commit',
      'tests/integration/README.md',
      'tests/contract/README.md',
    ],
  };

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    console.error(
      'design-docs-check failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'),
    );
    process.exit(1);
  }

  console.log('design-docs-check: OK');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          script: 'design-docs-check',
          ok: false,
          errors: [message],
        },
        null,
        2,
      ),
    );
  } else {
    console.error(message);
  }

  process.exit(1);
});
