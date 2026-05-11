/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for coa-worktree.mjs pure/testable helpers (generateSessionName, worktreePath, parseWorktreeArgs, listWorktrees).
 * @sidecar coa-worktree.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSessionName,
  worktreePath,
  parseWorktreeArgs,
} from '../../scripts/coa-worktree.mjs';

describe('coa-worktree: generateSessionName', () => {
  test('returns string starting with prefix', () => {
    const name = generateSessionName();
    assert.ok(name.startsWith('coa-session-'), `Expected prefix "coa-session-", got "${name}"`);
  });

  test('returns unique names on successive calls', () => {
    const a = generateSessionName();
    const b = generateSessionName();
    assert.notEqual(a, b);
  });

  test('accepts custom prefix', () => {
    const name = generateSessionName('my-agent-');
    assert.ok(name.startsWith('my-agent-'));
  });

  test('has 6 hex chars suffix', () => {
    const name = generateSessionName('p-');
    const suffix = name.slice(2); // strip 'p-'
    assert.match(suffix, /^[0-9a-f]{6}$/);
  });
});

describe('coa-worktree: worktreePath', () => {
  test('places worktree as sibling of repo root', () => {
    const result = worktreePath('/home/user/project', 'coa-session-abc123');
    assert.ok(result.endsWith('coa-session-abc123'));
    assert.ok(!result.includes('/project/coa-session-'));
  });

  test('works with Windows-style paths', () => {
    const result = worktreePath('C:\\Projects\\myrepo', 'coa-session-abc123');
    assert.ok(result.includes('coa-session-abc123'));
  });
});

describe('coa-worktree: parseWorktreeArgs', () => {
  test('parses --key=value args', () => {
    const args = parseWorktreeArgs(['--name=my-session', '--force']);
    assert.equal(args.get('--name'), 'my-session');
    assert.ok(args.has('--force'));
    assert.equal(args.get('--force'), undefined); // boolean flag
  });

  test('parses --create as boolean', () => {
    const args = parseWorktreeArgs(['--create']);
    assert.ok(args.has('--create'));
    assert.equal(args.get('--create'), undefined);
  });

  test('ignores non-flag arguments', () => {
    const args = parseWorktreeArgs(['hello', '--name=x']);
    assert.ok(!args.has('hello'));
    assert.equal(args.get('--name'), 'x');
  });

  test('handles empty argv', () => {
    const args = parseWorktreeArgs([]);
    assert.ok(!args.has('--create'));
  });
});
