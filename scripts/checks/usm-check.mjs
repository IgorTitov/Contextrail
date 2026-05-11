/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate that mandatory persona and workflow USM surfaces exist and that user-facing work can be traced through real USM artifacts.
 * @sidecar usm-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { collectWorkItems, parseArgs, result, walk } from './_shared.mjs';
import { ValidationError } from '../lib/errors.mjs';

const ROOT = process.cwd();
const args = parseArgs();
const wantJson = args.has('--json');
const errors = [];

const USER_FACING_TYPES = new Set([
  'story',
  'feature',
  'epic',
  'user_story',
  'job_story',
  'workflow_story',
  'ui_story',
]);

function abs(relPath) {
  return path.join(ROOT, relPath);
}

async function exists(relPath) {
  try {
    await access(abs(relPath));
    return true;
  } catch {
    return false;
  }
}

async function readText(relPath) {
  return readFile(abs(relPath), 'utf8');
}

function fail(message) {
  errors.push(new ValidationError(message));
}

function expectIncludes(text, needle, owner) {
  if (!text.includes(needle)) fail(`${owner} is missing required text: ${needle}`);
}

function isRealPersonaFile(file) {
  const posix = file.replaceAll('\\', '/');
  return (
    posix.startsWith('docs/usm/personas/') &&
    posix.endsWith('.md') &&
    ![
      'docs/usm/personas/README.md',
      'docs/usm/personas/template.md',
      'docs/usm/personas/persona-template.md',
    ].includes(posix)
  );
}

function isRealScenarioFile(file) {
  const posix = file.replaceAll('\\', '/');
  return (
    posix.startsWith('docs/usm/scenarios/') &&
    posix.endsWith('.md') &&
    !posix.endsWith('/README.md')
  );
}

async function main() {
  const [
    pkgText,
    claude,
    agents,
    usmIndex,
    personasReadme,
    scenariosReadme,
    templatesReadme,
    items,
    personaFiles,
    scenarioFiles,
  ] = await Promise.all([
    readText('package.json'),
    readText('.claude/CLAUDE.md'),
    readText('AGENTS.md'),
    readText('docs/usm/index.md'),
    readText('docs/usm/personas/README.md'),
    readText('docs/usm/scenarios/README.md'),
    readText('docs/usm/templates/README.md'),
    collectWorkItems(),
    walk('docs/usm/personas'),
    walk('docs/usm/scenarios'),
  ]);

  const pkg = JSON.parse(pkgText);
  if (pkg.scripts?.['usm-check'] !== 'node scripts/checks/usm-check.mjs') {
    fail('package.json is missing script usm-check -> node scripts/checks/usm-check.mjs');
  }

  for (const required of [
    'docs/usm/personas/persona-template.md',
    'docs/usm/templates/workflow-template.md',
  ]) {
    if (!(await exists(required))) fail(`missing canonical USM template: ${required}`);
  }

  // Validate persona template contains expanded model fields
  const personaTemplate = await readText('docs/usm/personas/persona-template.md');
  for (const field of ['Key frustrations', 'What the product helps them do', 'Jobs to be done']) {
    if (!personaTemplate.includes(field)) {
      fail(
        `docs/usm/personas/persona-template.md is missing expanded persona model field: ${field}`,
      );
    }
  }

  // Validate workflow template contains granularity ladder
  const workflowTemplate = await readText('docs/usm/templates/workflow-template.md');
  for (const section of ['cockpit-scenario', 'cockpit-usm', 'Granularity ladder']) {
    if (!workflowTemplate.includes(section)) {
      fail(
        `docs/usm/templates/workflow-template.md is missing structured scenario section: ${section}`,
      );
    }
  }

  expectIncludes(
    claude,
    'STOP. Before implementing any user-facing behavior change, route through `product-planner` and confirm USM coverage exists.',
    '.claude/CLAUDE.md',
  );
  expectIncludes(
    agents,
    'Use product-planner first for new intake, decomposition, USM, or PRD routing.',
    'AGENTS.md',
  );
  expectIncludes(usmIndex, 'persona-template.md', 'docs/usm/index.md');
  expectIncludes(usmIndex, 'workflow-template.md', 'docs/usm/index.md');
  expectIncludes(personasReadme, 'persona-template.md', 'docs/usm/personas/README.md');
  expectIncludes(templatesReadme, 'workflow-template.md', 'docs/usm/templates/README.md');
  expectIncludes(
    scenariosReadme,
    'docs/usm/scenarios/<persona-key>/<workflow-key>.md',
    'docs/usm/scenarios/README.md',
  );

  const realPersonas = personaFiles.filter(isRealPersonaFile);
  const realScenarios = scenarioFiles.filter(isRealScenarioFile);
  if (realPersonas.length === 0) {
    fail(
      'docs/usm/personas/ must contain at least one real persona example beyond templates and README',
    );
  }
  if (realScenarios.length === 0) {
    fail('docs/usm/scenarios/ must contain at least one real workflow example beyond README');
  }

  for (const item of items) {
    const type = String(item.type || '').trim();
    if (!USER_FACING_TYPES.has(type)) continue;
    const usmRefs = (item.spec_refs || []).filter((ref) => String(ref).startsWith('docs/usm/'));
    if (usmRefs.length === 0) {
      fail(
        `${item.source_file}: user-facing work item ${item.id} (${type}) must reference docs/usm/* in spec_refs`,
      );
    }
  }

  const output = result('usm-check', errors.length === 0, errors, [], {
    checked: [
      'package.json',
      '.claude/CLAUDE.md',
      'AGENTS.md',
      'docs/usm/index.md',
      'docs/usm/personas/README.md',
      'docs/usm/scenarios/README.md',
      'docs/usm/templates/README.md',
      'docs/usm/personas/persona-template.md',
      'docs/usm/templates/workflow-template.md',
    ],
    realPersonaCount: realPersonas.length,
    realScenarioCount: realScenarios.length,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    console.error('usm-check failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'));
    process.exit(1);
  }

  console.log('usm-check: OK');
}

main().catch((error) => {
  const output = result('usm-check', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
