/* @HEADER
 * @version 0.7.70 | 2026-05-03
 * @purpose Unit tests for scripts/lib/bypass-audit.mjs pure helpers (parseAuditLog, correlateCommitsToPhases, validateNonSkippablePresent, formatPhaseRecord).
 * @sidecar bypass-audit.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx bypass-audit
 * @public false
 * @edit careful
 */

/**
 * Unit tests for bypass-audit.mjs (R8.4 / TPL-258).
 *
 * All filesystem operations use os.tmpdir() paths (R1 compliant).
 * No git operations — pure-function coverage only.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseAuditLog,
  correlateCommitsToPhases,
  validateNonSkippablePresent,
  formatPhaseRecord,
  NON_SKIPPABLE_PHASES,
} from '../../scripts/lib/bypass-audit.mjs';

// ---------------------------------------------------------------------------
// parseAuditLog
// ---------------------------------------------------------------------------
describe('parseAuditLog', () => {
  it('returns empty array when file does not exist', () => {
    const result = parseAuditLog('/nonexistent/path/commit-audit.log');
    assert.deepEqual(result, []);
  });

  it('returns empty array for empty file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ba-unit-'));
    try {
      const logPath = join(dir, 'commit-audit.log');
      writeFileSync(logPath, '');
      const result = parseAuditLog(logPath);
      assert.deepEqual(result, []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parses valid NDJSON records', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ba-unit-'));
    try {
      const logPath = join(dir, 'commit-audit.log');
      const r1 = {
        ts: '2026-05-04T10:00:00Z',
        phases: ['1.0', '2.5', '7'],
        skipped: [],
        skipReason: '',
        commitSha: 'abc123',
      };
      const r2 = {
        ts: '2026-05-04T11:00:00Z',
        phases: ['1.0', '2.5', '7'],
        skipped: ['1', '2'],
        skipReason: '1,2',
        commitSha: 'def456',
      };
      writeFileSync(logPath, JSON.stringify(r1) + '\n' + JSON.stringify(r2) + '\n');

      const result = parseAuditLog(logPath);
      assert.equal(result.length, 2);
      assert.equal(result[0].commitSha, 'abc123');
      assert.equal(result[1].commitSha, 'def456');
      assert.deepEqual(result[1].skipped, ['1', '2']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips malformed lines without throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ba-unit-'));
    try {
      const logPath = join(dir, 'commit-audit.log');
      const good = JSON.stringify({
        ts: 't',
        phases: ['1.0'],
        skipped: [],
        skipReason: '',
        commitSha: 'sha1',
      });
      writeFileSync(logPath, `${good}\nNOT_JSON\n{incomplete\n`);

      const result = parseAuditLog(logPath);
      assert.equal(result.length, 1, 'only the valid line should parse');
      assert.equal(result[0].commitSha, 'sha1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips records without phases array', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ba-unit-'));
    try {
      const logPath = join(dir, 'commit-audit.log');
      const noPhases = JSON.stringify({ ts: 't', commitSha: 'sha1' });
      const withPhases = JSON.stringify({ ts: 't', phases: ['1.0'], commitSha: 'sha2' });
      writeFileSync(logPath, `${noPhases}\n${withPhases}\n`);

      const result = parseAuditLog(logPath);
      assert.equal(result.length, 1);
      assert.equal(result[0].commitSha, 'sha2');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles trailing blank lines gracefully', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ba-unit-'));
    try {
      const logPath = join(dir, 'commit-audit.log');
      const good = JSON.stringify({
        ts: 't',
        phases: ['7'],
        skipped: [],
        skipReason: '',
        commitSha: 'sha1',
      });
      writeFileSync(logPath, `${good}\n\n\n`);

      const result = parseAuditLog(logPath);
      assert.equal(result.length, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// validateNonSkippablePresent
// ---------------------------------------------------------------------------
describe('validateNonSkippablePresent', () => {
  it('returns empty array when all required phases are present', () => {
    const record = { phases: ['1.0', '2.5', '7', '1', '2'] };
    const missing = validateNonSkippablePresent(record, NON_SKIPPABLE_PHASES);
    assert.deepEqual(missing, []);
  });

  it('returns missing phases when some are absent', () => {
    const record = { phases: ['1.0', '2.5'] }; // missing '7'
    const missing = validateNonSkippablePresent(record, NON_SKIPPABLE_PHASES);
    assert.deepEqual(missing, ['7']);
  });

  it('returns all required phases when record has empty phases', () => {
    const record = { phases: [] };
    const missing = validateNonSkippablePresent(record, NON_SKIPPABLE_PHASES);
    assert.deepEqual(missing, ['1.0', '2.5', '7']);
  });

  it('returns all required phases when phases field is missing', () => {
    const record = {};
    const missing = validateNonSkippablePresent(record, []);
    assert.deepEqual(missing, []);
  });

  it('custom requiredPhases list works correctly', () => {
    const record = { phases: ['a', 'b'] };
    const missing = validateNonSkippablePresent(record, ['a', 'b', 'c']);
    assert.deepEqual(missing, ['c']);
  });
});

// ---------------------------------------------------------------------------
// correlateCommitsToPhases
// ---------------------------------------------------------------------------
describe('correlateCommitsToPhases', () => {
  it('reports all commits as matched when every SHA has a complete record', () => {
    const commits = ['abc', 'def'];
    const records = [
      { commitSha: 'abc', phases: ['1.0', '2.5', '7'], skipped: [], skipReason: '' },
      { commitSha: 'def', phases: ['1.0', '2.5', '7'], skipped: [], skipReason: '' },
    ];
    const { matched, gaps, incomplete } = correlateCommitsToPhases(commits, records);
    assert.deepEqual(matched, ['abc', 'def']);
    assert.deepEqual(gaps, []);
    assert.deepEqual(incomplete, []);
  });

  it('reports commits with no record as gaps', () => {
    const commits = ['abc', 'missing'];
    const records = [
      { commitSha: 'abc', phases: ['1.0', '2.5', '7'], skipped: [], skipReason: '' },
    ];
    const { matched, gaps, incomplete } = correlateCommitsToPhases(commits, records);
    assert.deepEqual(gaps, ['missing']);
    assert.deepEqual(matched, ['abc']);
    assert.deepEqual(incomplete, []);
  });

  it('reports commits with missing NON_SKIPPABLE phases as incomplete', () => {
    const commits = ['sha1'];
    const records = [
      { commitSha: 'sha1', phases: ['1.0', '2.5'], skipped: ['7'], skipReason: '7' },
    ];
    const { matched, gaps, incomplete } = correlateCommitsToPhases(commits, records);
    assert.deepEqual(gaps, []);
    assert.equal(incomplete.length, 1);
    assert.equal(incomplete[0].sha, 'sha1');
    assert.deepEqual(incomplete[0].missing, ['7']);
    assert.deepEqual(matched, []);
  });

  it('handles empty commits list gracefully', () => {
    const { matched, gaps, incomplete } = correlateCommitsToPhases([], []);
    assert.deepEqual(matched, []);
    assert.deepEqual(gaps, []);
    assert.deepEqual(incomplete, []);
  });

  it('handles empty records list — all commits become gaps', () => {
    const commits = ['a', 'b', 'c'];
    const { gaps } = correlateCommitsToPhases(commits, []);
    assert.deepEqual(gaps, ['a', 'b', 'c']);
  });

  it('ignores records with null/missing commitSha', () => {
    const commits = ['real'];
    const records = [
      { commitSha: null, phases: ['1.0', '2.5', '7'] },
      { commitSha: 'null', phases: ['1.0', '2.5', '7'] },
    ];
    const { gaps } = correlateCommitsToPhases(commits, records);
    assert.deepEqual(
      gaps,
      ['real'],
      'records with null/string-null SHA must not match real commits',
    );
  });

  it('uses the most recent record when multiple records share a SHA (last write wins)', () => {
    const commits = ['sha1'];
    const records = [
      { commitSha: 'sha1', phases: ['1.0'], skipped: [], skipReason: '' }, // old, incomplete
      { commitSha: 'sha1', phases: ['1.0', '2.5', '7'], skipped: [], skipReason: '' }, // newer, complete
    ];
    const { matched, incomplete } = correlateCommitsToPhases(commits, records);
    // Map.set with duplicate key keeps the last write, so matched should win
    assert.deepEqual(matched, ['sha1'], 'last record should be used');
    assert.deepEqual(incomplete, []);
  });
});

// ---------------------------------------------------------------------------
// formatPhaseRecord
// ---------------------------------------------------------------------------
describe('formatPhaseRecord', () => {
  it('produces valid JSON string', () => {
    const line = formatPhaseRecord({
      phases: ['1.0', '2.5', '7'],
      skipped: ['1', '2'],
      skipReason: '1,2',
      commitSha: 'abc123',
    });
    const obj = JSON.parse(line);
    assert.deepEqual(obj.phases, ['1.0', '2.5', '7']);
    assert.deepEqual(obj.skipped, ['1', '2']);
    assert.equal(obj.skipReason, '1,2');
    assert.equal(obj.commitSha, 'abc123');
    assert.ok(obj.ts, 'ts field must be present');
  });

  it('handles null commitSha', () => {
    const line = formatPhaseRecord({
      phases: ['1.0'],
      skipped: [],
      skipReason: '',
      commitSha: null,
    });
    const obj = JSON.parse(line);
    assert.equal(obj.commitSha, null);
  });

  it('handles missing optional fields gracefully', () => {
    const line = formatPhaseRecord({ phases: [] });
    const obj = JSON.parse(line);
    assert.deepEqual(obj.phases, []);
    assert.deepEqual(obj.skipped, []);
    assert.equal(obj.skipReason, '');
    assert.equal(obj.commitSha, null);
  });
});

// ---------------------------------------------------------------------------
// NON_SKIPPABLE_PHASES constant
// ---------------------------------------------------------------------------
describe('NON_SKIPPABLE_PHASES', () => {
  it('is a frozen array containing at minimum 1.0, 2.5, and 7', () => {
    assert.ok(Array.isArray(NON_SKIPPABLE_PHASES));
    assert.ok(NON_SKIPPABLE_PHASES.includes('1.0'), 'must include 1.0 (hook integrity)');
    assert.ok(NON_SKIPPABLE_PHASES.includes('2.5'), 'must include 2.5 (test isolation)');
    assert.ok(NON_SKIPPABLE_PHASES.includes('7'), 'must include 7 (heavy gates)');
  });

  it('is frozen (immutable)', () => {
    assert.throws(
      () => {
        NON_SKIPPABLE_PHASES.push('99');
      },
      TypeError,
      'pushing to a frozen array should throw',
    );
  });
});
