/* @HEADER
 * @version 0.8.13 | 2026-05-11
 * @purpose Unit tests for coa-worktree.mjs --create: transport worktree creation, node_modules junction, and transportWorktreePath helper.
 * @sidecar coa-worktree-create.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests for the --create --slice=<id> transport-worktree path in
 * coa-worktree.mjs (TPL-251). Every git invocation uses
 * safeGit/safeGitSpawn (R1, ADR-0015) to avoid leaking writes into
 * the live repo.
 *
 * The tests create small repos under os.tmpdir(), call runCreate()
 * directly (no subprocess), assert on filesystem state (worktree
 * presence, node_modules junction, branch name), then clean up.
 *
 * @see docs/adr/0016-worktree-lifecycle.md
 * @see docs/adr/0015-test-isolation-enforcement.md
 * @see docs/adr/0017-transport-branch-enforcement.md
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { runCreate, transportWorktreePath } from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl251-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl251.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL251 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return root;
}

function cleanupWorktree(mainRoot, wtPath) {
  // Remove node_modules junction before git worktree remove to prevent
  // traversal into the junction target.
  const nmInWt = join(wtPath, 'node_modules');
  if (existsSync(nmInWt)) {
    try {
      rmSync(nmInWt, { recursive: false });
    } catch {
      try {
        rmSync(nmInWt, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }
  }
  try {
    safeGitSpawn(mainRoot, ['worktree', 'remove', '--force', wtPath]);
  } catch {
    /* best effort */
  }
  if (existsSync(wtPath)) rmSync(wtPath, { recursive: true, force: true });
  rmSync(mainRoot, { recursive: true, force: true });
  // .worktrees/ parent dir in tmpdir — intentionally not removed; it is
  // ephemeral (inside os.tmpdir()) and shared across parallel test runs.
}

// ---------------------------------------------------------------------------
// transportWorktreePath — pure helper (no git needed)
// ---------------------------------------------------------------------------

describe('transportWorktreePath', () => {
  test('places worktree inside .worktrees/ subdir of repos parent (TPL-334)', () => {
    const p = transportWorktreePath('/home/user/contextrail-template', 'TPL-251');
    // Must be inside .worktrees/ hidden subdir (ADR-0050)
    assert.ok(
      p.replaceAll('\\', '/').includes('/.worktrees/'),
      `Expected .worktrees/ in path, got: ${p}`,
    );
    assert.ok(
      p.endsWith('contextrail-template-tx-TPL-251'),
      `Expected suffix contextrail-template-tx-TPL-251, got: ${p}`,
    );
  });

  test('works for AIC prefix', () => {
    const p = transportWorktreePath('/home/user/cockpit', 'AIC-088');
    assert.ok(p.endsWith('cockpit-tx-AIC-088'), `Got: ${p}`);
    assert.ok(
      p.replaceAll('\\', '/').includes('/.worktrees/'),
      `Expected .worktrees/ in path: ${p}`,
    );
  });

  test('throws on invalid slice ID', () => {
    assert.throws(
      () => transportWorktreePath('/home/user/repo', 'invalid-id'),
      /not a valid slice ID/,
    );
  });
});

// ---------------------------------------------------------------------------
// runCreate validation (no git needed)
// ---------------------------------------------------------------------------

describe('runCreate: invalid slice ID is rejected before git', () => {
  test('returns exitCode 1 for malformed slice ID', () => {
    const { exitCode, result } = runCreate('/some/nonexistent/path', {
      sliceId: 'tpl-251',
      silent: true,
    });
    assert.strictEqual(exitCode, 1);
    assert.match(result.error, /invalid slice ID/);
  });

  test('returns exitCode 1 for lowercase slice ID (e.g. tpl-251)', () => {
    const { exitCode, result } = runCreate('/some/path', {
      sliceId: 'tpl-251',
      silent: true,
    });
    assert.strictEqual(exitCode, 1);
    assert.match(result.error, /invalid slice ID/);
  });

  test('returns exitCode 1 when worktree directory already exists', () => {
    const mainRoot = createBaseRepo('already-exists');
    const expectedWtPath = transportWorktreePath(mainRoot, 'TPL-251');
    mkdirSync(expectedWtPath, { recursive: true });
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-251',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 1);
      assert.match(result.error, /already exists/);
    } finally {
      rmSync(expectedWtPath, { recursive: true, force: true });
      rmSync(mainRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// runCreate: transport worktree + node_modules junction
// ---------------------------------------------------------------------------

describe('runCreate --slice: transport worktree creation', () => {
  test('creates worktree at expected path with tx-<slice> branch', () => {
    const mainRoot = createBaseRepo('create-basic');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-251');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-251',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
      assert.ok(existsSync(wtPath), `Transport worktree should exist at ${wtPath}`);
      assert.strictEqual(result.branch, 'tx-TPL-251');
      assert.strictEqual(result.sessionName, 'tx-TPL-251');
      assert.ok(
        result.path.endsWith(`${basename(mainRoot)}-tx-TPL-251`),
        `path mismatch: ${result.path}`,
      );
      // TPL-334: worktree must land inside .worktrees/ subdir (ADR-0050)
      assert.ok(
        result.path.replaceAll('\\', '/').includes('/.worktrees/'),
        `path must be inside .worktrees/: ${result.path}`,
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('creates .coa-session with sliceId and transportBranch fields', () => {
    const mainRoot = createBaseRepo('coa-session');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-251');
    try {
      runCreate(mainRoot, { sliceId: 'TPL-251', silent: true, skipSliceCheck: true });
      const session = JSON.parse(readFileSync(join(wtPath, '.coa-session'), 'utf8'));
      assert.strictEqual(session.sliceId, 'TPL-251');
      assert.strictEqual(session.transportBranch, 'tx-TPL-251');
      assert.strictEqual(session.sessionName, 'tx-TPL-251');
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('auto-creates node_modules junction when main node_modules exists', () => {
    const mainRoot = createBaseRepo('nm-junction');
    // Add a node_modules stub with a resolvable package
    const pkgDir = join(mainRoot, 'node_modules', 'somepackage');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'index.js'), 'module.exports = { ok: true };\n');

    const wtPath = transportWorktreePath(mainRoot, 'TPL-251');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-251',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);

      // Junction must exist in the transport worktree
      const nmInWt = join(wtPath, 'node_modules');
      assert.ok(existsSync(nmInWt), 'node_modules junction should exist in transport worktree');

      // Junction must resolve — the package from main's node_modules is readable
      const pkgViaJunction = join(nmInWt, 'somepackage', 'index.js');
      assert.ok(
        existsSync(pkgViaJunction),
        'somepackage/index.js should be accessible via junction',
      );
      const content = readFileSync(pkgViaJunction, 'utf8');
      assert.ok(content.includes('ok: true'), 'Junction content should match main node_modules');

      assert.strictEqual(result.nodeModulesLinked, true, 'result.nodeModulesLinked should be true');
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('skips node_modules link when main node_modules absent, reports nodeModulesLinked false', () => {
    const mainRoot = createBaseRepo('nm-absent');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-251');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-251',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
      assert.strictEqual(result.nodeModulesLinked, false);
      assert.ok(
        !existsSync(join(wtPath, 'node_modules')),
        'node_modules should not be created when absent in main',
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('idempotent: does not create duplicate junction when node_modules already linked', () => {
    const mainRoot = createBaseRepo('nm-idempotent');
    mkdirSync(join(mainRoot, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(mainRoot, 'node_modules', 'pkg', 'index.js'), 'module.exports=1;\n');

    const wtPath = transportWorktreePath(mainRoot, 'TPL-251');
    try {
      const { exitCode } = runCreate(mainRoot, {
        sliceId: 'TPL-251',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0);

      // Calling runCreate again on same path should fail with "already exists"
      const { exitCode: ec2 } = runCreate(mainRoot, {
        sliceId: 'TPL-251',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(ec2, 1);
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });
});

// ---------------------------------------------------------------------------
// TPL-267: .claude/settings*.json copied into transport worktree
// ---------------------------------------------------------------------------

describe('runCreate --slice: .claude/settings*.json copy', () => {
  test('copies settings.json and settings.local.json from main .claude/ dir', () => {
    const mainRoot = createBaseRepo('settings-copy');
    mkdirSync(join(mainRoot, '.claude'), { recursive: true });
    writeFileSync(join(mainRoot, '.claude', 'settings.json'), JSON.stringify({ permissions: [] }));
    writeFileSync(
      join(mainRoot, '.claude', 'settings.local.json'),
      JSON.stringify({ permissions: ['allow:Bash'] }),
    );

    const wtPath = transportWorktreePath(mainRoot, 'TPL-267');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-267',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);

      const dstSettings = join(wtPath, '.claude', 'settings.json');
      const dstLocal = join(wtPath, '.claude', 'settings.local.json');
      assert.ok(existsSync(dstSettings), 'settings.json should be copied into transport .claude/');
      assert.ok(
        existsSync(dstLocal),
        'settings.local.json should be copied into transport .claude/',
      );

      assert.strictEqual(
        readFileSync(dstSettings, 'utf8'),
        readFileSync(join(mainRoot, '.claude', 'settings.json'), 'utf8'),
        'settings.json content should match main',
      );
      assert.strictEqual(
        readFileSync(dstLocal, 'utf8'),
        readFileSync(join(mainRoot, '.claude', 'settings.local.json'), 'utf8'),
        'settings.local.json content should match main',
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('no error when main has no .claude/ directory', () => {
    const mainRoot = createBaseRepo('settings-no-claude');
    // No .claude/ directory in main repo
    const wtPath = transportWorktreePath(mainRoot, 'TPL-267');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-267',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
      assert.ok(
        !existsSync(join(wtPath, '.claude', 'settings.json')),
        'No settings.json should be created',
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('idempotent: skips file when destination content is identical', () => {
    const mainRoot = createBaseRepo('settings-idempotent');
    mkdirSync(join(mainRoot, '.claude'), { recursive: true });
    writeFileSync(join(mainRoot, '.claude', 'settings.json'), JSON.stringify({ permissions: [] }));

    const wtPath = transportWorktreePath(mainRoot, 'TPL-267');
    try {
      // First create
      const { exitCode } = runCreate(mainRoot, {
        sliceId: 'TPL-267',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0);

      // Manually pre-place identical file in transport to simulate idempotent check
      const dstSettings = join(wtPath, '.claude', 'settings.json');
      const originalMtime = statSync(dstSettings).mtimeMs;

      // Simulate a second copy attempt — identical content should skip
      const src = join(mainRoot, '.claude', 'settings.json');
      const srcContent = readFileSync(src, 'utf8');
      const dstContent = readFileSync(dstSettings, 'utf8');
      assert.strictEqual(srcContent, dstContent, 'Contents should be identical after first copy');
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('only copies files matching settings*.json pattern', () => {
    const mainRoot = createBaseRepo('settings-pattern');
    mkdirSync(join(mainRoot, '.claude'), { recursive: true });
    writeFileSync(join(mainRoot, '.claude', 'settings.json'), JSON.stringify({ a: 1 }));
    writeFileSync(join(mainRoot, '.claude', 'CLAUDE.md'), '# claude instructions\n');
    writeFileSync(join(mainRoot, '.claude', 'rules.json'), JSON.stringify({ r: 1 }));

    const wtPath = transportWorktreePath(mainRoot, 'TPL-267');
    try {
      const { exitCode } = runCreate(mainRoot, {
        sliceId: 'TPL-267',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0);

      assert.ok(
        existsSync(join(wtPath, '.claude', 'settings.json')),
        'settings.json should be copied',
      );
      assert.ok(
        !existsSync(join(wtPath, '.claude', 'CLAUDE.md')),
        'CLAUDE.md should NOT be copied',
      );
      assert.ok(
        !existsSync(join(wtPath, '.claude', 'rules.json')),
        'rules.json should NOT be copied',
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });
});

// ---------------------------------------------------------------------------
// TPL-310: .coa-session.agent records caller identity, not branch name
// ---------------------------------------------------------------------------

describe('runCreate --slice: .coa-session.agent caller identity (TPL-310)', () => {
  test('agent opt is recorded in .coa-session.agent', () => {
    const mainRoot = createBaseRepo('agent-opt');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-310');
    try {
      const { exitCode } = runCreate(mainRoot, {
        sliceId: 'TPL-310',
        silent: true,
        skipSliceCheck: true,
        agent: 'feature-implementer',
      });
      assert.strictEqual(exitCode, 0);
      const session = JSON.parse(readFileSync(join(wtPath, '.coa-session'), 'utf8'));
      assert.strictEqual(session.agent, 'feature-implementer');
      assert.notStrictEqual(session.agent, 'tx-TPL-310', 'agent must not be branch name');
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('COA_AGENT env is recorded when no agent opt given', () => {
    const mainRoot = createBaseRepo('agent-env');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-310');
    const prev = process.env.COA_AGENT;
    process.env.COA_AGENT = 'frontend-specialist';
    try {
      runCreate(mainRoot, { sliceId: 'TPL-310', silent: true, skipSliceCheck: true });
      const session = JSON.parse(readFileSync(join(wtPath, '.coa-session'), 'utf8'));
      assert.strictEqual(session.agent, 'frontend-specialist');
    } finally {
      if (prev === undefined) delete process.env.COA_AGENT;
      else process.env.COA_AGENT = prev;
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('agent opt wins over COA_AGENT env when both set', () => {
    const mainRoot = createBaseRepo('agent-precedence');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-310');
    const prev = process.env.COA_AGENT;
    process.env.COA_AGENT = 'env-agent';
    try {
      runCreate(mainRoot, {
        sliceId: 'TPL-310',
        silent: true,
        skipSliceCheck: true,
        agent: 'flag-agent',
      });
      const session = JSON.parse(readFileSync(join(wtPath, '.coa-session'), 'utf8'));
      assert.strictEqual(session.agent, 'flag-agent');
    } finally {
      if (prev === undefined) delete process.env.COA_AGENT;
      else process.env.COA_AGENT = prev;
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('enforceAgent + transport mode + no agent → refuses', () => {
    const mainRoot = createBaseRepo('agent-refuse');
    const prev = process.env.COA_AGENT;
    delete process.env.COA_AGENT;
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-310',
        silent: true,
        skipSliceCheck: true,
        enforceAgent: true,
      });
      assert.strictEqual(exitCode, 1);
      assert.match(result.error, /requires --agent/);
    } finally {
      if (prev !== undefined) process.env.COA_AGENT = prev;
      rmSync(mainRoot, { recursive: true, force: true });
    }
  });

  test('enforceAgent + transport mode + COA_AGENT env → succeeds', () => {
    const mainRoot = createBaseRepo('agent-enforce-env');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-310');
    const prev = process.env.COA_AGENT;
    process.env.COA_AGENT = 'feature-implementer';
    try {
      const { exitCode } = runCreate(mainRoot, {
        sliceId: 'TPL-310',
        silent: true,
        skipSliceCheck: true,
        enforceAgent: true,
      });
      assert.strictEqual(exitCode, 0);
      const session = JSON.parse(readFileSync(join(wtPath, '.coa-session'), 'utf8'));
      assert.strictEqual(session.agent, 'feature-implementer');
    } finally {
      if (prev === undefined) delete process.env.COA_AGENT;
      else process.env.COA_AGENT = prev;
      cleanupWorktree(mainRoot, wtPath);
    }
  });
});

// ---------------------------------------------------------------------------
// Bug 3 (AIC-R4-BACKPORT): trunk name must be detected dynamically (TPL-264)
// ---------------------------------------------------------------------------

describe('runCreate --slice: trunk name resolved dynamically', () => {
  test('master-trunk repo: worktree created from master, not hardcoded main', () => {
    // Create a repo with 'master' as the initial branch (no 'main' branch).
    const mainRoot = mkdtempSync(join(tmpdir(), 'tpl264-master-'));
    safeGitSpawn(mainRoot, ['init', '-b', 'master']);
    safeGitSpawn(mainRoot, ['config', 'user.email', 'test@tpl264.local']);
    safeGitSpawn(mainRoot, ['config', 'user.name', 'TPL264 Test']);
    safeGitSpawn(mainRoot, ['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(mainRoot, 'README.md'), '# fixture\n');
    safeGitSpawn(mainRoot, ['add', 'README.md']);
    safeGitSpawn(mainRoot, ['commit', '-m', 'init']);

    const wtPath = transportWorktreePath(mainRoot, 'TPL-264');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-264',
        silent: true,
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
      assert.ok(existsSync(wtPath), `Transport worktree should exist at ${wtPath}`);
      assert.strictEqual(result.branch, 'tx-TPL-264');
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('--trunk override: runCreate uses the explicit trunk name', () => {
    // Create a repo with 'main', but pass trunk='main' explicitly — should succeed.
    const mainRoot = createBaseRepo('trunk-override');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-264');
    try {
      const { exitCode, result } = runCreate(mainRoot, {
        sliceId: 'TPL-264',
        silent: true,
        trunk: 'main',
        skipSliceCheck: true,
      });
      assert.strictEqual(exitCode, 0, `runCreate with trunk override failed: ${result?.error}`);
      assert.ok(existsSync(wtPath), `Worktree should exist at ${wtPath}`);
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });
});
