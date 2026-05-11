/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the portable Node Claude hook really denies dangerous commands and sensitive edits.
 * @sidecar dangerous-command-hook.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hookPath = fileURLToPath(
  new URL('../../.claude/hooks/run-dangerous-command-blocker.mjs', import.meta.url),
);

function runHook(payload) {
  return spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

function parseDecision(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return null;
  }
  return JSON.parse(trimmed).hookSpecificOutput ?? null;
}

test('portable hook denies destructive bash commands', () => {
  const result = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'rm -rf /tmp/demo' },
  });

  assert.equal(result.status, 0);
  const decision = parseDecision(result.stdout);
  assert.equal(decision?.permissionDecision, 'deny');
  assert.match(decision?.permissionDecisionReason ?? '', /rm recursive force/);
});

test('portable hook denies edits to sensitive paths', () => {
  const result = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: '.claude/settings.json' },
  });

  assert.equal(result.status, 0);
  const decision = parseDecision(result.stdout);
  assert.equal(decision?.permissionDecision, 'deny');
  assert.match(decision?.permissionDecisionReason ?? '', /sensitive path/i);
});

test('portable hook allows safe bash commands to pass through silently', () => {
  const result = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'printf "template ok"' },
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '');
  assert.equal(result.stderr.trim(), '');
});
