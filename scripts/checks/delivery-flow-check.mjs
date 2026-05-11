/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate agreement across canonical implementation, frontend, and acceptance-lane files plus the bounded-reading rules that keep feature work small and LLM-friendly.
 * @sidecar delivery-flow-check.mjs.header.md
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
    repoArchitect,
    featureImplementer,
    frontendSpecialist,
    acceptanceTester,
    architectureRule,
    developmentRule,
    scriptsReadme,
    preCommit,
    integrationReadme,
    contractReadme,
  ] = await Promise.all([
    readJson('package.json'),
    readText('.claude/CLAUDE.md'),
    readText('.claude/agents/README.md'),
    readText('.claude/skills/README.md'),
    readText('.claude/agents/repo-architect.md'),
    readText('.claude/agents/feature-implementer.md'),
    readText('.claude/agents/frontend-specialist.md'),
    readText('.claude/agents/acceptance-tester.md'),
    readText('.claude/rules/architecture.md'),
    readText('.claude/rules/development.md'),
    readText('scripts/checks/README.md'),
    readText('.githooks/pre-commit'),
    readText('tests/integration/README.md'),
    readText('tests/contract/README.md'),
  ]);

  if (pkg.scripts['delivery-flow-check'] !== 'node scripts/checks/delivery-flow-check.mjs') {
    fail('package.json is missing the canonical delivery-flow-check script');
  }

  for (const needle of [
    'feature-implementer',
    'frontend-specialist',
    'acceptance-tester',
    'headers, public APIs, tests',
    'Deep-read implementation code mainly in files you will actually change',
    'delivery-flow-check.mjs',
  ]) {
    expectIncludes(claude, needle, '.claude/CLAUDE.md');
  }

  const agentNames = new Set(extractBacktickBullets(agentsReadme));
  for (const expected of ['feature-implementer', 'frontend-specialist', 'acceptance-tester']) {
    if (!agentNames.has(expected)) {
      fail(`.claude/agents/README.md is missing listed agent: ${expected}`);
    }
  }

  const skillNames = new Set(extractBacktickBullets(skillsReadme));
  for (const expected of ['feature-delivery', 'frontend-delivery', 'acceptance-validation']) {
    if (!skillNames.has(expected)) {
      fail(`.claude/skills/README.md is missing listed skill: ${expected}`);
    }
  }

  expectIncludes(
    repoArchitect,
    'slices small enough that a weaker local model',
    '.claude/agents/repo-architect.md',
  );
  expectIncludes(
    featureImplementer,
    'Deep-read the files you will actually change',
    '.claude/agents/feature-implementer.md',
  );
  expectIncludes(featureImplementer, 'pre-impl-gate.mjs', '.claude/agents/feature-implementer.md');
  expectIncludes(
    featureImplementer,
    'uses headers/public APIs/tests for untouched areas',
    '.claude/agents/feature-implementer.md',
  );
  expectIncludes(frontendSpecialist, 'selectors', '.claude/agents/frontend-specialist.md');
  expectIncludes(frontendSpecialist, 'product-planner', '.claude/agents/frontend-specialist.md');
  expectIncludes(frontendSpecialist, 'accessibility', '.claude/agents/frontend-specialist.md');
  expectIncludes(acceptanceTester, 'ready for finalization', '.claude/agents/acceptance-tester.md');
  expectIncludes(acceptanceTester, 'still uncommitted', '.claude/agents/acceptance-tester.md');

  expectIncludes(
    architectureRule,
    'Only deep-read implementation in files you are touching',
    '.claude/rules/architecture.md',
  );
  expectIncludes(
    architectureRule,
    'Use headers, public APIs, tests, and nearby docs',
    '.claude/rules/architecture.md',
  );
  expectIncludes(
    developmentRule,
    'Deep-read the files you will actually change',
    '.claude/rules/development.md',
  );
  expectIncludes(
    developmentRule,
    'For untouched areas, use headers, public APIs, tests, and nearby docs',
    '.claude/rules/development.md',
  );

  expectIncludes(scriptsReadme, 'delivery-flow-check.mjs', 'scripts/checks/README.md');
  expectIncludes(scriptsReadme, 'pre-impl-gate.mjs', 'scripts/checks/README.md');
  expectIncludes(scriptsReadme, 'changeset-size-check.mjs', 'scripts/checks/README.md');
  expectIncludes(preCommit, 'node scripts/checks/delivery-flow-check.mjs', '.githooks/pre-commit');
  expectIncludes(
    integrationReadme,
    'delivery-flow-coherence.test.mjs',
    'tests/integration/README.md',
  );
  expectIncludes(contractReadme, 'delivery-agents-contract.test.mjs', 'tests/contract/README.md');

  const output = {
    script: 'delivery-flow-check',
    ok: errors.length === 0,
    errors: errors.map((e) => (e && typeof e.toJSON === 'function' ? e.toJSON() : String(e))),
    checked: [
      'package.json',
      '.claude/CLAUDE.md',
      '.claude/agents/README.md',
      '.claude/skills/README.md',
      '.claude/agents/repo-architect.md',
      '.claude/agents/feature-implementer.md',
      '.claude/agents/frontend-specialist.md',
      '.claude/agents/acceptance-tester.md',
      '.claude/rules/architecture.md',
      '.claude/rules/development.md',
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
      'delivery-flow-check failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'),
    );
    process.exit(1);
  }

  console.log('delivery-flow-check: OK');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          script: 'delivery-flow-check',
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
