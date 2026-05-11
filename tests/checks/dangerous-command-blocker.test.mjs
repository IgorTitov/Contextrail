/* @HEADER
 * @version 0.7.64 | 2026-05-03
 * @purpose Unit tests: dangerous-command-blocker local-fs allowlist for git push --force-with-lease (TPL-262)
 * @sidecar dangerous-command-blocker.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = resolve(__dirname, '../../.claude/hooks/run-dangerous-command-blocker.mjs');
const REPO_ROOT = resolve(__dirname, '../..').replace(/\\/g, '/');

function runHook(command, cwd = resolve(__dirname, '../..')) {
  return spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    cwd,
  });
}

function decision(result) {
  const trimmed = result.stdout.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed).hookSpecificOutput ?? null;
}

describe('dangerous-command-blocker: git push --force-with-lease local-fs allowlist (TPL-262)', () => {
  test('AC4-pos: allows --force-with-lease to an absolute local-fs path', () => {
    const result = runHook(`git push --force-with-lease ${REPO_ROOT} main`);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '', 'hook must produce no output (allowed)');
  });

  test('AC4-edge-file: allows --force-with-lease to a file:// URI', () => {
    const fileUri = `file://${REPO_ROOT}`;
    const result = runHook(`git push --force-with-lease ${fileUri} main`);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '', 'hook must produce no output (allowed)');
  });

  test('AC4-edge-rel: allows --force-with-lease to a relative path that resolves locally', () => {
    // '../contextrail-template' relative to REPO_ROOT resolves back to REPO_ROOT (exists)
    const result = runHook('git push --force-with-lease ../contextrail-template main');
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '', 'hook must produce no output (allowed)');
  });

  test('AC4-neg-https: blocks --force-with-lease to https:// remote', () => {
    const result = runHook('git push --force-with-lease https://github.com/user/repo.git main');
    const dec = decision(result);
    assert.equal(dec?.permissionDecision, 'deny');
    assert.match(dec?.permissionDecisionReason ?? '', /force-with-lease/);
  });

  test('AC4-neg-gitat: blocks --force-with-lease to git@ SSH-shorthand remote', () => {
    const result = runHook('git push --force-with-lease git@github.com:user/repo.git main');
    const dec = decision(result);
    assert.equal(dec?.permissionDecision, 'deny');
    assert.match(dec?.permissionDecisionReason ?? '', /force-with-lease/);
  });

  test('AC4-neg-ssh: blocks --force-with-lease to ssh:// remote', () => {
    const result = runHook('git push --force-with-lease ssh://user@host/repo.git main');
    const dec = decision(result);
    assert.equal(dec?.permissionDecision, 'deny');
    assert.match(dec?.permissionDecisionReason ?? '', /force-with-lease/);
  });

  test('AC4-neg-force: blocks bare --force even to a local-fs path (still destructive)', () => {
    const result = runHook(`git push --force ${REPO_ROOT} main`);
    const dec = decision(result);
    assert.equal(dec?.permissionDecision, 'deny');
    assert.match(dec?.permissionDecisionReason ?? '', /force/i);
  });
});
