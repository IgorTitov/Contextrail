/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate that package scripts, VS Code tasks, Claude settings, and helper scripts agree on the template workflow.
 * @sidecar repo-workflow.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const tasks = JSON.parse(
  readFileSync(new URL('../../.vscode/tasks.json', import.meta.url), 'utf8'),
);
const settings = JSON.parse(
  readFileSync(new URL('../../.claude/settings.json', import.meta.url), 'utf8'),
);
const helper = readFileSync(
  new URL('../../.claude/skills/bdd-playwright/scripts/run-playwright-check.mjs', import.meta.url),
  'utf8',
);

function taskByLabel(label) {
  return tasks.tasks.find((task) => task.label === label);
}

test('package scripts expose real granular test stages', () => {
  for (const name of [
    'test:unit',
    'test:integration',
    'test:contract',
    'test:bdd',
    'test:e2e:smoke',
    'usm-check',
    'pre-impl-gate',
    'changeset-size-check',
    'e2e:headed',
  ]) {
    assert.ok(pkg.scripts[name], `expected package script ${name}`);
    assert.doesNotMatch(pkg.scripts[name], /placeholder/i);
  }
});

test('VS Code tasks still point at real package scripts', () => {
  assert.equal(taskByLabel('Test')?.args?.[0], 'test');
  assert.equal(taskByLabel('Test and Merge and Zip')?.args?.[0], 'test:all:mergezip');
  assert.equal(taskByLabel('E2E (visible)')?.args?.[0], 'e2e:visible');
});

test('Claude settings use the portable Node hook launcher', () => {
  const allHooks = [
    ...(settings.hooks?.PreToolUse ?? []),
    ...(settings.hooks?.PostToolUse ?? []),
  ];
  const commands = allHooks.flatMap((entry) => (entry.hooks ?? []).map((hook) => hook.command));
  assert.ok(commands.length >= 2, `expected at least 2 hook commands, got ${commands.length}`);
  for (const command of commands) {
    assert.match(command, /^node \.claude\/hooks\//, `hook command not portable: ${command}`);
  }
});

test('Playwright helper recognizes the template script names', () => {
  assert.match(helper, /test:e2e:smoke/);
  assert.match(helper, /'e2e'/);
  assert.equal(pkg.scripts['e2e:headed'], 'node scripts/checks/run-e2e.mjs --headed');
  assert.equal(pkg.scripts['e2e:visible'], 'node scripts/checks/run-e2e.mjs --headed');
});
