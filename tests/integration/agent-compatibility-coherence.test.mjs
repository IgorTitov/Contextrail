/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the canonical agent contract, package scripts, pre-commit wiring, and generated adapters stay aligned.
 * @sidecar agent-compatibility-coherence.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const preCommit = readFileSync(new URL('../../.githooks/pre-commit', import.meta.url), 'utf8');
const docsReadme = readFileSync(
  new URL('../../docs/agent-contract/README.md', import.meta.url),
  'utf8',
);
const agents = readFileSync(new URL('../../AGENTS.md', import.meta.url), 'utf8');
const claude = readFileSync(new URL('../../.claude/CLAUDE.md', import.meta.url), 'utf8');

test('package exposes compatibility-layer entrypoints', () => {
  assert.equal(pkg.scripts['agent-contract:sync'], 'node scripts/agent-contract/sync.mjs');
  assert.equal(pkg.scripts['agent-contract:check'], 'node scripts/agent-contract/check.mjs');
});

test('pre-commit runs compatibility sync and parity check', () => {
  assert.ok(preCommit.includes('node scripts/agent-contract/sync.mjs'));
  assert.ok(preCommit.includes('node scripts/agent-contract/check.mjs'));
});

test('canonical source path is shared across human docs and both adapters', () => {
  for (const surface of [docsReadme, agents, claude]) {
    assert.ok(surface.includes('docs/agent-contract/compatibility-contract.json'));
  }
});

test('agent-contract check script succeeds against the current repo state', () => {
  const run = spawnSync(process.execPath, ['scripts/agent-contract/check.mjs', '--json'], {
    cwd: new URL('../../', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const output = JSON.parse(run.stdout);
  assert.equal(output.ok, true);
});

test('pre-impl-gate skips bootstrap repositories that do not yet have a baseline commit', () => {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-contract-bootstrap-'));
  const repoRoot = new URL('../../', import.meta.url);
  const tempRepo = path.join(fixtureRoot, 'repo');
  cpSync(repoRoot, tempRepo, { recursive: true, force: true });
  rmSync(path.join(tempRepo, '.git'), { recursive: true, force: true });

  try {
    const init = safeGitSpawn(tempRepo, ['init'], { encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr || init.stdout);

    const run = spawnSync(process.execPath, ['scripts/checks/pre-impl-gate.mjs', '--json'], {
      cwd: tempRepo,
      encoding: 'utf8',
    });

    assert.equal(run.status, 0, run.stderr || run.stdout);
    const output = JSON.parse(run.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.data?.skipped, true);
    assert.equal(output.data?.reason, 'no baseline commit detected');
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
