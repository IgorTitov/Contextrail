/* @HEADER
 * @version 0.7.109 | 2026-05-06
 * @purpose Integration tests for .coa/slice-id-config.json reader, validator, bootstrap scaffolding, and auto-pick end-to-end behavior (TPL-300 / ADR-0032).
 * @sidecar slice-id-config.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Slice-ID config integration tests (TPL-300).
 *
 * 8 test groups covering:
 *   1. Config missing → ConfigMissingError with recovery hint
 *   2. Config exists, valid → detectDefaultPrefix returns config.prefix
 *   3. Config exists, invalid schema → ConfigSchemaError with field
 *   4. coa-worktree runCreate without config → refuses cleanly
 *   5. bootstrap writeDefaultSliceIdConfig creates default config
 *   6. writeDefaultSliceIdConfig is idempotent (config already exists)
 *   7. Auto-pick uses config numbering_start + padding
 *   8. Custom prefix MYPROJ end-to-end (auto-pick picks MYPROJ-001)
 *
 * All git setup uses safeGit / safeGitSpawn (R1, ADR-0015).
 *
 * @see docs/adr/0032-slice-id-config.md
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  readSliceIdConfig,
  validateSliceIdConfig,
  writeDefaultSliceIdConfig,
  ConfigMissingError,
  ConfigSchemaError,
} from '../../scripts/lib/slice-id-config.mjs';
import {
  detectDefaultPrefix,
  autoPickNextSliceId,
  runCreate,
} from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `sic-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@sic.local']);
  safeGitSpawn(root, ['config', 'user.name', 'SIC Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'init.txt'), 'init\n');
  safeGitSpawn(root, ['add', 'init.txt']);
  safeGitSpawn(root, ['commit', '-m', 'chore: init']);
  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(join(root, '.claims', '.gitkeep'), '');
  return root;
}

/** Write .coa/slice-id-config.json with the given fields. */
function writeConfig(root, config) {
  mkdirSync(join(root, '.coa'), { recursive: true });
  writeFileSync(
    join(root, '.coa', 'slice-id-config.json'),
    JSON.stringify(config, null, 2) + '\n',
    'utf8',
  );
}

// ---------------------------------------------------------------------------
// Test 1: Config missing → ConfigMissingError with recovery hint
// ---------------------------------------------------------------------------

describe('readSliceIdConfig: missing config', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'sic-t1-'));
  });
  after(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  test('T1: throws ConfigMissingError when .coa/slice-id-config.json absent', () => {
    assert.throws(
      () => readSliceIdConfig(root),
      (err) => {
        assert.ok(
          err instanceof ConfigMissingError,
          `expected ConfigMissingError, got ${err.constructor.name}`,
        );
        assert.strictEqual(err.code, 'CONFIG_MISSING');
        assert.ok(
          err.message.includes('bootstrap.mjs --init-slice-config'),
          `recovery hint missing: ${err.message}`,
        );
        assert.ok(err.message.includes('slice-id-config.md'), `guide link missing: ${err.message}`);
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Test 2: Config exists with valid schema → detectDefaultPrefix returns prefix
// ---------------------------------------------------------------------------

describe('detectDefaultPrefix: reads from config', () => {
  let root;
  before(() => {
    root = makeRepo('t2');
    writeConfig(root, { prefix: 'MYAPP', numbering_start: 1, padding: 3 });
  });
  after(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  test('T2: detectDefaultPrefix returns config.prefix', () => {
    const prefix = detectDefaultPrefix(root);
    assert.strictEqual(prefix, 'MYAPP');
  });

  test('T2b: readSliceIdConfig parses all fields correctly', () => {
    const config = readSliceIdConfig(root);
    assert.strictEqual(config.prefix, 'MYAPP');
    assert.strictEqual(config.numbering_start, 1);
    assert.strictEqual(config.padding, 3);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Config exists with invalid schema → ConfigSchemaError with field
// ---------------------------------------------------------------------------

describe('validateSliceIdConfig: schema violations', () => {
  test('T3a: missing prefix → ConfigSchemaError on prefix field', () => {
    assert.throws(
      () => validateSliceIdConfig({ numbering_start: 1 }),
      (err) => {
        assert.ok(
          err instanceof ConfigSchemaError,
          `expected ConfigSchemaError, got ${err.constructor.name}`,
        );
        assert.strictEqual(err.field, 'prefix');
        return true;
      },
    );
  });

  test('T3b: lowercase prefix → ConfigSchemaError on prefix field', () => {
    assert.throws(
      () => validateSliceIdConfig({ prefix: 'myapp' }),
      (err) => {
        assert.ok(err instanceof ConfigSchemaError);
        assert.strictEqual(err.field, 'prefix');
        return true;
      },
    );
  });

  test('T3c: format without {NNN} → ConfigSchemaError on format field', () => {
    assert.throws(
      () => validateSliceIdConfig({ prefix: 'APP', format: 'APP-123' }),
      (err) => {
        assert.ok(err instanceof ConfigSchemaError);
        assert.strictEqual(err.field, 'format');
        return true;
      },
    );
  });

  test('T3d: padding out of range → ConfigSchemaError on padding field', () => {
    assert.throws(
      () => validateSliceIdConfig({ prefix: 'APP', padding: 0 }),
      (err) => {
        assert.ok(err instanceof ConfigSchemaError);
        assert.strictEqual(err.field, 'padding');
        return true;
      },
    );
  });

  test('T3e: valid config passes without throwing', () => {
    assert.doesNotThrow(() =>
      validateSliceIdConfig({
        prefix: 'DEV',
        format: 'DEV-{NNN}',
        numbering_start: 100,
        padding: 3,
      }),
    );
  });

  // TPL-303 — multi-segment prefix support
  test('T3f: AIC-DEV is a valid multi-segment prefix', () => {
    assert.doesNotThrow(() => validateSliceIdConfig({ prefix: 'AIC-DEV' }));
  });

  test('T3g: RELEASE-Q1-FEAT is a valid three-segment prefix', () => {
    assert.doesNotThrow(() => validateSliceIdConfig({ prefix: 'RELEASE-Q1-FEAT' }));
  });

  test('T3h: lowercase prefix is rejected', () => {
    assert.throws(
      () => validateSliceIdConfig({ prefix: 'lowercase' }),
      (err) => {
        assert.ok(err instanceof ConfigSchemaError);
        assert.strictEqual(err.field, 'prefix');
        return true;
      },
    );
  });

  test('T3i: double-hyphen prefix BAD--DOUBLE is rejected', () => {
    assert.throws(
      () => validateSliceIdConfig({ prefix: 'BAD--DOUBLE' }),
      (err) => {
        assert.ok(err instanceof ConfigSchemaError);
        assert.strictEqual(err.field, 'prefix');
        return true;
      },
    );
  });

  test('T3j: trailing-hyphen prefix BAD- is rejected', () => {
    assert.throws(
      () => validateSliceIdConfig({ prefix: 'BAD-' }),
      (err) => {
        assert.ok(err instanceof ConfigSchemaError);
        assert.strictEqual(err.field, 'prefix');
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Test 4: coa-worktree runCreate without config → refuses cleanly
// ---------------------------------------------------------------------------

describe('runCreate: fails cleanly without config', () => {
  let root;
  before(() => {
    root = makeRepo('t4');
  });
  after(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  test('T4: runCreate auto-pick without config returns exitCode=1 with recovery hint', () => {
    // No .coa/slice-id-config.json in this repo
    const { exitCode, result } = runCreate(root, {
      autoPick: true,
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 1, `expected exitCode=1, got ${exitCode}`);
    assert.ok(
      result.error.includes('bootstrap.mjs --init-slice-config'),
      `expected recovery hint in error, got: ${result.error}`,
    );
  });

  test('T4b: runCreate default (no --slice, no --name) without config fails cleanly', () => {
    const { exitCode, result } = runCreate(root, {
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 1);
    assert.ok(result.error.includes('slice-id-config'), `error: ${result.error}`);
  });
});

// ---------------------------------------------------------------------------
// Test 5: writeDefaultSliceIdConfig creates default config
// ---------------------------------------------------------------------------

describe('writeDefaultSliceIdConfig: creates config', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'sic-t5-'));
  });
  after(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  test('T5: creates .coa/slice-id-config.json with default prefix MYPROJ', () => {
    const result = writeDefaultSliceIdConfig(root);
    assert.strictEqual(result.created, true);
    assert.ok(existsSync(result.path), `config file not created at ${result.path}`);
    assert.strictEqual(result.prefix, 'MYPROJ');

    const config = JSON.parse(readFileSync(result.path, 'utf8'));
    assert.strictEqual(config.prefix, 'MYPROJ');
    assert.ok(typeof config.padding === 'number');
    assert.ok(typeof config.numbering_start === 'number');
  });

  test('T5b: creates with custom prefix when opts.prefix is provided', () => {
    const root2 = mkdtempSync(join(tmpdir(), 'sic-t5b-'));
    try {
      const result = writeDefaultSliceIdConfig(root2, { prefix: 'ACME' });
      assert.strictEqual(result.created, true);
      assert.strictEqual(result.prefix, 'ACME');
      const config = JSON.parse(readFileSync(result.path, 'utf8'));
      assert.strictEqual(config.prefix, 'ACME');
    } finally {
      try {
        rmSync(root2, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Test 6: writeDefaultSliceIdConfig is idempotent
// ---------------------------------------------------------------------------

describe('writeDefaultSliceIdConfig: idempotent', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'sic-t6-'));
    writeConfig(root, { prefix: 'EXISTING', numbering_start: 42, padding: 4 });
  });
  after(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  test('T6: returns created=false and leaves config unchanged when file exists', () => {
    const result = writeDefaultSliceIdConfig(root, { prefix: 'DIFFERENT' });
    assert.strictEqual(result.created, false);
    // Original config is unchanged
    const config = JSON.parse(readFileSync(join(root, '.coa', 'slice-id-config.json'), 'utf8'));
    assert.strictEqual(config.prefix, 'EXISTING', 'existing config must not be overwritten');
    assert.strictEqual(config.numbering_start, 42);
  });
});

// ---------------------------------------------------------------------------
// Test 7: Auto-pick uses config's numbering_start and padding
// ---------------------------------------------------------------------------

describe('autoPickNextSliceId: respects numbering_start and padding from config', () => {
  let root;
  before(() => {
    root = makeRepo('t7');
    // Config: start IDs at 5, use 4-digit padding
    writeConfig(root, { prefix: 'TST', numbering_start: 5, padding: 4 });
  });
  after(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  test('T7: auto-pick picks numbering_start when no history exists', () => {
    const config = readSliceIdConfig(root);
    const id = autoPickNextSliceId(root, config.prefix, join(root, '.claims'), {
      padding: config.padding,
      numberingStart: config.numbering_start,
    });
    assert.strictEqual(id, 'TST-0005', `expected TST-0005, got ${id}`);
  });

  test('T7b: runCreate with config picks correct ID (numbering_start=5, padding=4)', () => {
    const { exitCode, result } = runCreate(root, {
      autoPick: true,
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
    assert.ok(result.autoPicked, 'result must have autoPicked field');
    // Should be TST-0005 (4-digit, starting at 5)
    assert.strictEqual(
      result.autoPicked,
      'TST-0005',
      `expected TST-0005, got ${result.autoPicked}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 8: Custom prefix MYPROJ end-to-end
// ---------------------------------------------------------------------------

describe('runCreate: custom prefix MYPROJ end-to-end', () => {
  let root;
  before(() => {
    root = makeRepo('t8');
    writeConfig(root, { prefix: 'MYPROJ', format: 'MYPROJ-{NNN}', numbering_start: 1, padding: 3 });
  });
  after(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  test('T8: runCreate auto-picks MYPROJ-001 with custom prefix config', () => {
    const { exitCode, result } = runCreate(root, {
      autoPick: true,
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
    assert.ok(result.autoPicked, 'result must have autoPicked field');
    assert.ok(
      result.autoPicked.startsWith('MYPROJ-'),
      `expected MYPROJ- prefix, got ${result.autoPicked}`,
    );
    assert.strictEqual(result.autoPicked, 'MYPROJ-001');
  });

  test('T8b: detectDefaultPrefix returns MYPROJ from config (not from history)', () => {
    const prefix = detectDefaultPrefix(root);
    assert.strictEqual(prefix, 'MYPROJ');
  });
});
