/* @HEADER
 * @version 0.7.87 | 2026-05-05
 * @purpose Unit tests for scripts/lib/hook-integrity.mjs pure helpers (computeFingerprint, loadFingerprints, compareFingerprints, formatRegistry).
 * @sidecar hook-integrity.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx hook-integrity
 * @public false
 * @edit careful
 */

/**
 * Unit tests for hook-integrity.mjs (R8.2 / TPL-256).
 *
 * All filesystem operations use os.tmpdir() paths (R1 compliant).
 * No git operations — pure-function coverage only.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  computeFingerprint,
  loadFingerprints,
  compareFingerprints,
  formatRegistry,
} from '../../scripts/lib/hook-integrity.mjs';

// ---------------------------------------------------------------------------
// computeFingerprint
// ---------------------------------------------------------------------------
describe('computeFingerprint', () => {
  it('returns a 64-char hex sha256 and correct byte size', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hi-unit-'));
    const filePath = join(dir, 'hook.sh');
    const content = '#!/usr/bin/env bash\necho hello\n';
    writeFileSync(filePath, content);

    const { sha256, size } = computeFingerprint(filePath);

    assert.equal(typeof sha256, 'string', 'sha256 must be a string');
    assert.equal(sha256.length, 64, 'sha256 must be 64 hex chars');
    assert.match(sha256, /^[0-9a-f]{64}$/, 'sha256 must be lowercase hex');
    assert.equal(size, Buffer.byteLength(content), 'size must match byte length');
  });

  it('returns the same sha256 for identical content (stability)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hi-unit-'));
    const content = '#!/usr/bin/env bash\nset -e\n';
    writeFileSync(join(dir, 'a.sh'), content);
    writeFileSync(join(dir, 'b.sh'), content);

    const r1 = computeFingerprint(join(dir, 'a.sh'));
    const r2 = computeFingerprint(join(dir, 'b.sh'));

    assert.equal(r1.sha256, r2.sha256, 'identical content must produce identical sha256');
    assert.equal(r1.size, r2.size);
  });

  it('returns different sha256 for different content', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hi-unit-'));
    writeFileSync(join(dir, 'a.sh'), 'content-a');
    writeFileSync(join(dir, 'b.sh'), 'content-b');

    const r1 = computeFingerprint(join(dir, 'a.sh'));
    const r2 = computeFingerprint(join(dir, 'b.sh'));

    assert.notEqual(r1.sha256, r2.sha256);
  });
});

// ---------------------------------------------------------------------------
// loadFingerprints
// ---------------------------------------------------------------------------
describe('loadFingerprints', () => {
  it('parses a valid registry JSON and returns the parsed object', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hi-unit-'));
    const registry = {
      version: '1.0',
      hooks: {
        '.githooks/pre-commit': {
          sha256: 'a'.repeat(64),
          size: 1234,
          lastUpdated: '2026-05-04T00:00:00.000Z',
          lastUpdateSlice: 'TPL-256',
        },
      },
    };
    const filePath = join(dir, '.fingerprints.json');
    writeFileSync(filePath, JSON.stringify(registry, null, 2));

    const parsed = loadFingerprints(filePath);
    assert.equal(parsed.version, '1.0');
    assert.equal(typeof parsed.hooks, 'object');
    assert.equal(parsed.hooks['.githooks/pre-commit'].sha256, 'a'.repeat(64));
    assert.equal(parsed.hooks['.githooks/pre-commit'].size, 1234);
  });

  it('throws ENOENT for a missing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hi-unit-'));
    const missing = join(dir, 'does-not-exist.json');
    assert.throws(
      () => loadFingerprints(missing),
      (err) => err.code === 'ENOENT',
    );
  });

  it('strips an inline header prefix before parsing (TPL-277 resilience)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hi-unit-'));
    const registry = { version: '1.0', hooks: {} };
    const jsonBody = JSON.stringify(registry, null, 2);
    const withPrefix = `# @HEADER\n# @version 0.0.1 | 2026-01-01\n\n${jsonBody}`;
    const filePath = join(dir, '.fingerprints.json');
    writeFileSync(filePath, withPrefix);

    const parsed = loadFingerprints(filePath);
    assert.equal(parsed.version, '1.0');
    assert.equal(typeof parsed.hooks, 'object');
  });

  it('throws SyntaxError when no JSON object found in file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hi-unit-'));
    const filePath = join(dir, 'empty.json');
    writeFileSync(filePath, '# only a comment, no JSON');
    assert.throws(() => loadFingerprints(filePath), SyntaxError);
  });
});

// ---------------------------------------------------------------------------
// compareFingerprints
// ---------------------------------------------------------------------------
describe('compareFingerprints', () => {
  it('returns empty arrays when all entries match', () => {
    const hookFiles = [
      { path: '.githooks/pre-commit', sha256: 'abc123'.padEnd(64, '0'), size: 100 },
      { path: '.githooks/pre-push', sha256: 'def456'.padEnd(64, '0'), size: 200 },
    ];
    const registry = {
      '.githooks/pre-commit': { sha256: 'abc123'.padEnd(64, '0'), size: 100 },
      '.githooks/pre-push': { sha256: 'def456'.padEnd(64, '0'), size: 200 },
    };

    const result = compareFingerprints(hookFiles, registry);
    assert.deepEqual(result.mismatches, []);
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.extras, []);
  });

  it('reports mismatch when sha256 differs', () => {
    const hookFiles = [{ path: '.githooks/pre-commit', sha256: 'aaa'.padEnd(64, '0'), size: 100 }];
    const registry = {
      '.githooks/pre-commit': { sha256: 'bbb'.padEnd(64, '0'), size: 100 },
    };

    const result = compareFingerprints(hookFiles, registry);
    assert.deepEqual(result.mismatches, ['.githooks/pre-commit']);
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.extras, []);
  });

  it('reports mismatch when size differs (sha256 same)', () => {
    const hookFiles = [{ path: '.githooks/pre-commit', sha256: 'abc'.padEnd(64, '0'), size: 999 }];
    const registry = {
      '.githooks/pre-commit': { sha256: 'abc'.padEnd(64, '0'), size: 100 },
    };

    const result = compareFingerprints(hookFiles, registry);
    assert.deepEqual(result.mismatches, ['.githooks/pre-commit']);
    assert.deepEqual(result.missing, []);
  });

  it('reports missing when file is in registry but absent from actual', () => {
    const hookFiles = []; // no files on disk
    const registry = {
      '.githooks/pre-commit': { sha256: 'abc'.padEnd(64, '0'), size: 100 },
    };

    const result = compareFingerprints(hookFiles, registry);
    assert.deepEqual(result.missing, ['.githooks/pre-commit']);
    assert.deepEqual(result.mismatches, []);
    assert.deepEqual(result.extras, []);
  });

  it('reports extra when file is on disk but not in registry', () => {
    const hookFiles = [{ path: '.githooks/post-merge', sha256: 'xyz'.padEnd(64, '0'), size: 50 }];
    const registry = {}; // empty — no known hooks

    const result = compareFingerprints(hookFiles, registry);
    assert.deepEqual(result.extras, ['.githooks/post-merge']);
    assert.deepEqual(result.mismatches, []);
    assert.deepEqual(result.missing, []);
  });

  it('handles all three cases simultaneously', () => {
    const hookFiles = [
      { path: '.githooks/pre-commit', sha256: 'aaa'.padEnd(64, '0'), size: 100 }, // mismatch
      { path: '.githooks/post-merge', sha256: 'ccc'.padEnd(64, '0'), size: 50 }, // extra
      // .githooks/pre-push is in registry but absent → missing
    ];
    const registry = {
      '.githooks/pre-commit': { sha256: 'bbb'.padEnd(64, '0'), size: 100 },
      '.githooks/pre-push': { sha256: 'ddd'.padEnd(64, '0'), size: 200 },
    };

    const result = compareFingerprints(hookFiles, registry);
    assert.deepEqual(result.mismatches, ['.githooks/pre-commit']);
    assert.deepEqual(result.missing, ['.githooks/pre-push']);
    assert.deepEqual(result.extras, ['.githooks/post-merge']);
  });
});

// ---------------------------------------------------------------------------
// formatRegistry
// ---------------------------------------------------------------------------
describe('formatRegistry', () => {
  it('produces valid JSON with version field', () => {
    const entries = [{ path: '.githooks/pre-commit', sha256: 'abc'.padEnd(64, '0'), size: 100 }];
    const json = formatRegistry(entries, 'TPL-256');

    let parsed;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(json);
    }, 'must produce parseable JSON');
    assert.equal(parsed.version, '1.0', 'must have version field "1.0"');
    assert.equal(typeof parsed.hooks, 'object');
    assert.equal(parsed.hooks['.githooks/pre-commit'].sha256, 'abc'.padEnd(64, '0'));
    assert.equal(parsed.hooks['.githooks/pre-commit'].size, 100);
    assert.equal(parsed.hooks['.githooks/pre-commit'].lastUpdateSlice, 'TPL-256');
    assert.equal(typeof parsed.hooks['.githooks/pre-commit'].lastUpdated, 'string');
  });

  it('includes all entries passed', () => {
    const entries = [
      { path: '.githooks/pre-commit', sha256: 'a'.repeat(64), size: 10 },
      { path: '.githooks/pre-push', sha256: 'b'.repeat(64), size: 20 },
      { path: '.githooks/commit-msg', sha256: 'c'.repeat(64), size: 30 },
    ];
    const parsed = JSON.parse(formatRegistry(entries, 'TEST-001'));
    assert.equal(Object.keys(parsed.hooks).length, 3);
  });

  it('ends with a newline (consistent file output)', () => {
    const entries = [{ path: '.githooks/pre-commit', sha256: 'a'.repeat(64), size: 1 }];
    const json = formatRegistry(entries, 'TPL-256');
    assert.equal(json.at(-1), '\n', 'output must end with newline');
  });
});
