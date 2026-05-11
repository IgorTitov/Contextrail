/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate agreement across canonical control-plane files, script names, task wiring, hook orchestration, delivery-model docs, and proof surfaces.
 * @sidecar control-plane-check.mjs.header.md
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

function taskByLabel(tasks, label) {
  return tasks.tasks.find((task) => task.label === label);
}

function taskScriptName(task) {
  if (!task) return null;

  if (Array.isArray(task.args) && typeof task.args[0] === 'string') {
    return task.args[0];
  }

  if (typeof task.command === 'string') {
    const match = task.command.trim().match(/^pnpm\s+([^\s]+)$/);
    if (match) return match[1];
  }

  return null;
}

function checkTaskScript(tasks, pkg, label, expectedScript) {
  const task = taskByLabel(tasks, label);
  if (!task) {
    fail(`.vscode/tasks.json is missing task label: ${label}`);
    return;
  }

  const actualScript = taskScriptName(task);
  if (actualScript !== expectedScript) {
    fail(
      `task "${label}" should point at package script "${expectedScript}" but points at "${actualScript ?? '_none_'}"`,
    );
    return;
  }

  if (!pkg.scripts[expectedScript]) {
    fail(`package.json is missing script required by task "${label}": ${expectedScript}`);
  }
}

async function main() {
  const [
    pkg,
    claude,
    agentsReadme,
    skillsReadme,
    scriptsReadme,
    claudeHooksReadme,
    gitHooksReadme,
    preCommit,
    vscodeReadme,
    settings,
    tasks,
    adr,
    adrReadme,
    integrationReadme,
  ] = await Promise.all([
    readJson('package.json'),
    readText('.claude/CLAUDE.md'),
    readText('.claude/agents/README.md'),
    readText('.claude/skills/README.md'),
    readText('scripts/checks/README.md'),
    readText('.claude/hooks/README.md'),
    readText('.githooks/README.md'),
    readText('.githooks/pre-commit'),
    readText('.vscode/readme.md'),
    readJson('.vscode/settings.json'),
    readJson('.vscode/tasks.json'),
    readText('docs/adr/0002-trunk-based-delivery.md'),
    readText('docs/adr/README.md'),
    readText('tests/integration/README.md'),
  ]);

  for (const scriptName of [
    'architecture-check',
    'control-plane-check',
    'product-docs-check',
    'usm-check',
    'pre-impl-gate',
    'header-check',
    'readme-check',
    'capabilities-check',
    'test',
    'mergezip',
    'test:all:mergezip',
  ]) {
    if (!pkg.scripts[scriptName]) {
      fail(`package.json is missing required script: ${scriptName}`);
    }
  }

  for (const needle of [
    'repo-architect',
    'control-plane-supervisor',
    'product-planner',
    'Trunk-Based Development',
    'Branch by Abstraction',
    '.backups/',
    'post-commit',
    'control-plane-check.mjs',
    'product-docs-check.mjs',
    'usm-check.mjs',
    'pre-impl-gate.mjs',
  ]) {
    expectIncludes(claude, needle, '.claude/CLAUDE.md');
  }

  const agentNames = new Set(extractBacktickBullets(agentsReadme));
  for (const expected of [
    'repo-architect',
    'control-plane-supervisor',
    'product-planner',
    'tech-writer',
    'test-guardian',
    'hex-architect',
    'release-operator',
    'security-screener',
    'repo-cartographer',
    'changelog-curator',
    'header-guardian',
    'readme-guardian',
  ]) {
    if (!agentNames.has(expected)) {
      fail(`.claude/agents/README.md is missing listed agent: ${expected}`);
    }
  }

  const skillNames = new Set(extractBacktickBullets(skillsReadme));
  for (const expected of [
    'spec-traceability',
    'prd-usm-backlog',
    'tdd',
    'bdd-playwright',
    'hex-boundary',
    'repo-nav',
    'control-plane-design',
    'control-plane-audit',
    'trunk-bba',
    'header-sidecar',
    'readme-discipline',
    'changelog-release',
    'security-audit',
  ]) {
    if (!skillNames.has(expected)) {
      fail(`.claude/skills/README.md is missing listed skill: ${expected}`);
    }
  }

  expectIncludes(
    scriptsReadme,
    'control-plane-check.mjs',
    'product-docs-check.mjs',
    'scripts/checks/README.md',
  );
  expectIncludes(scriptsReadme, 'product-docs-check.mjs', 'scripts/checks/README.md');
  expectIncludes(scriptsReadme, 'usm-check.mjs', 'scripts/checks/README.md');
  expectIncludes(scriptsReadme, 'pre-impl-gate.mjs', 'scripts/checks/README.md');
  expectIncludes(claudeHooksReadme, 'run-dangerous-command-blocker.mjs', '.claude/hooks/README.md');
  expectIncludes(gitHooksReadme, 'post-commit', '.githooks/README.md');
  expectIncludes(preCommit, 'node scripts/checks/usm-check.mjs', '.githooks/pre-commit');
  expectIncludes(preCommit, 'node scripts/checks/pre-impl-gate.mjs', '.githooks/pre-commit');
  expectIncludes(preCommit, 'node scripts/checks/control-plane-check.mjs', '.githooks/pre-commit');

  const taskLabels = new Set(tasks.tasks.map((task) => task.label));
  const buttonLabels = (settings.actionButtons?.commands ?? [])
    .map((command) => command.args?.[0])
    .filter((value) => typeof value === 'string');

  for (const label of buttonLabels) {
    if (!taskLabels.has(label)) {
      fail(`.vscode/settings.json button points at missing VS Code task label: ${label}`);
    }
  }

  checkTaskScript(tasks, pkg, 'Test', 'test');
  checkTaskScript(tasks, pkg, 'Merge and Zip', 'mergezip');
  checkTaskScript(tasks, pkg, 'Test and Merge and Zip', 'test:all:mergezip');
  checkTaskScript(tasks, pkg, 'E2E (visible)', 'e2e:visible');

  expectIncludes(vscodeReadme, 'tasks', '.vscode/readme.md');
  expectIncludes(vscodeReadme, 'settings.json', '.vscode/readme.md');
  expectIncludes(adr, 'Branch by Abstraction', 'docs/adr/0002-trunk-based-delivery.md');
  expectIncludes(adr, '.backups/', 'docs/adr/0002-trunk-based-delivery.md');
  expectIncludes(adr, 'mergezip', 'docs/adr/0002-trunk-based-delivery.md');
  expectIncludes(adr, 'pre-commit', 'docs/adr/0002-trunk-based-delivery.md');
  expectIncludes(adr, 'post-commit', 'docs/adr/0002-trunk-based-delivery.md');
  expectIncludes(adrReadme, '0002-trunk-based-delivery.md', 'docs/adr/README.md');
  expectIncludes(
    integrationReadme,
    'control-plane-coherence.test.mjs',
    'tests/integration/README.md',
  );

  const output = {
    script: 'control-plane-check',
    ok: errors.length === 0,
    errors: errors.map((e) => (e && typeof e.toJSON === 'function' ? e.toJSON() : String(e))),
    checked: [
      'package.json',
      '.claude/CLAUDE.md',
      '.claude/agents/README.md',
      '.claude/skills/README.md',
      'scripts/checks/README.md',
      '.claude/hooks/README.md',
      '.githooks/README.md',
      '.githooks/pre-commit',
      '.vscode/settings.json',
      '.vscode/tasks.json',
      '.vscode/readme.md',
      'docs/adr/0002-trunk-based-delivery.md',
      'docs/adr/README.md',
      'tests/integration/README.md',
    ],
  };

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    console.error(
      'control-plane-check failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'),
    );
    process.exit(1);
  }

  console.log('control-plane-check: OK');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          script: 'control-plane-check',
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
