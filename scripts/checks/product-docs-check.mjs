/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate that PRD, USM, backlog, personas, and intake-routing docs stay aligned with the canonical product-doc process.
 * @sidecar product-docs-check.mjs.header.md
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
    docsReadme,
    prd,
    usm,
    personas,
    scenarios,
    backlog,
    backlogTemplates,
    intakeTemplate,
    personasTemplateReadme,
    workflowTemplateReadme,
  ] = await Promise.all([
    readJson('package.json'),
    readText('.claude/CLAUDE.md'),
    readText('.claude/agents/README.md'),
    readText('.claude/skills/README.md'),
    readText('docs/README.md'),
    readText('docs/prd/index.md'),
    readText('docs/usm/index.md'),
    readText('docs/usm/personas/README.md'),
    readText('docs/usm/scenarios/README.md'),
    readText('docs/backlog/index.md'),
    readText('docs/backlog/templates/README.md'),
    readText('docs/backlog/templates/intake-item.md'),
    readText('docs/usm/personas/README.md'),
    readText('docs/usm/templates/README.md'),
  ]);

  if (pkg.scripts['product-docs-check'] !== 'node scripts/checks/product-docs-check.mjs') {
    fail('package.json is missing the canonical product-docs-check script');
  }
  if (pkg.scripts['usm-check'] !== 'node scripts/checks/usm-check.mjs') {
    fail('package.json is missing the canonical usm-check script');
  }
  if (pkg.scripts['pre-impl-gate'] !== 'node scripts/checks/pre-impl-gate.mjs') {
    fail('package.json is missing the canonical pre-impl-gate script');
  }

  for (const needle of [
    'product-planner',
    'prd-usm-backlog',
    'product-docs-check.mjs',
    'raw intake first',
    'docs/usm/personas/',
    'STOP. Before implementing any user-facing behavior change, route through `product-planner` and confirm USM coverage exists.',
    'pre-impl-gate.mjs',
    'usm-check.mjs',
  ]) {
    expectIncludes(claude, needle, '.claude/CLAUDE.md');
  }

  const agentNames = new Set(extractBacktickBullets(agentsReadme));
  if (!agentNames.has('product-planner')) {
    fail('.claude/agents/README.md is missing listed agent: product-planner');
  }

  const skillNames = new Set(extractBacktickBullets(skillsReadme));
  if (!skillNames.has('prd-usm-backlog')) {
    fail('.claude/skills/README.md is missing listed skill: prd-usm-backlog');
  }

  expectIncludes(docsReadme, 'PRD owns requirement intent', 'docs/README.md');
  expectIncludes(docsReadme, 'USM owns persona-centered workflows', 'docs/README.md');
  expectIncludes(
    docsReadme,
    'Backlog owns intake, priority, ordering, and execution status',
    'docs/README.md',
  );
  expectIncludes(docsReadme, 'BPMN is optional', 'docs/README.md');

  expectIncludes(prd, 'PRD is the source of truth for requirement intent', 'docs/prd/index.md');
  expectIncludes(
    prd,
    'Technical or non-functional work may start here without USM',
    'docs/prd/index.md',
  );

  expectIncludes(
    usm,
    'Each significant workflow gets its own USM scenario map',
    'docs/usm/index.md',
  );
  expectIncludes(usm, 'docs/usm/personas/', 'docs/usm/index.md');
  expectIncludes(usm, 'docs/usm/scenarios/', 'docs/usm/index.md');
  expectIncludes(usm, 'persona-template.md', 'docs/usm/index.md');
  expectIncludes(usm, 'workflow-template.md', 'docs/usm/index.md');

  expectIncludes(personas, 'docs/usm/personas/<persona-key>.md', 'docs/usm/personas/README.md');
  expectIncludes(personasTemplateReadme, 'persona-template.md', 'docs/usm/personas/README.md');
  expectIncludes(
    scenarios,
    'docs/usm/scenarios/<persona-key>/<workflow-key>.md',
    'docs/usm/scenarios/README.md',
  );

  expectIncludes(
    backlog,
    'Every new request enters the backlog as raw intake at the bottom first.',
    'docs/backlog/index.md',
  );
  expectIncludes(backlog, 'Ready for implementation', 'docs/backlog/index.md');
  expectIncludes(backlogTemplates, 'intake-item.md', 'docs/backlog/templates/README.md');
  expectIncludes(workflowTemplateReadme, 'workflow-template.md', 'docs/usm/templates/README.md');
  expectIncludes(intakeTemplate, 'type: intake', 'docs/backlog/templates/intake-item.md');
  expectIncludes(intakeTemplate, 'status: proposed', 'docs/backlog/templates/intake-item.md');

  const output = {
    script: 'product-docs-check',
    ok: errors.length === 0,
    errors: errors.map((e) => (e && typeof e.toJSON === 'function' ? e.toJSON() : String(e))),
    checked: [
      'package.json',
      '.claude/CLAUDE.md',
      '.claude/agents/README.md',
      '.claude/skills/README.md',
      'docs/README.md',
      'docs/prd/index.md',
      'docs/usm/index.md',
      'docs/usm/personas/README.md',
      'docs/usm/scenarios/README.md',
      'docs/backlog/index.md',
      'docs/backlog/templates/README.md',
      'docs/backlog/templates/intake-item.md',
    ],
  };

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    console.error(
      'product-docs-check failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'),
    );
    process.exit(1);
  }

  console.log('product-docs-check: OK');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          script: 'product-docs-check',
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
