/* @HEADER
 * @version 0.8.9 | 2026-05-11
 * @purpose Regression proof for TPL-331: dependency-graph must preserve the existing _generated timestamp when stable content is re-serialized.
 * @sidecar dependency-graph-generated.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-331 — dependency-graph _generated stability regression test.
 *
 * Before the fix, every run of dependency-graph.mjs replaced `_generated`
 * with a fresh `new Date().toISOString()`, even when module content was
 * unchanged. This caused the file to appear "modified" in git status after
 * every ceremony, producing fingerprint drift in .githooks/.fingerprints.json
 * and requiring a `hook-integrity-check --update` after each run.
 *
 * After the fix:
 * - `parseJsonOrNull()` reads the existing file without throwing on parse errors.
 * - If `stableSerialize(existing) === stableSerialize(newPayload)` AND
 *   `existing._generated` is present, the old timestamp is reused.
 *
 * This test proves the fix: run dependency-graph twice; the `_generated`
 * field in the output must be identical across both runs.
 *
 * Note: this test writes to docs/_generated/dependency-graph.json in the
 * active worktree. That file is generated output and safe to overwrite.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const DEP_GRAPH = join(REPO_ROOT, 'scripts', 'checks', 'dependency-graph.mjs');
const OUT = join(REPO_ROOT, 'docs', '_generated', 'dependency-graph.json');

describe('dependency-graph _generated stability — TPL-331', () => {
  test('preserves _generated timestamp when module content is stable between runs', () => {
    // First run: generates the output file (or updates it if already current).
    const run1 = spawnSync(process.execPath, [DEP_GRAPH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    assert.equal(
      run1.status,
      0,
      `First run failed (status ${run1.status}):\n${run1.stderr}\n${run1.stdout}`,
    );

    assert.ok(existsSync(OUT), `Output file not found after first run: ${OUT}`);
    const generated1 = JSON.parse(readFileSync(OUT, 'utf8'))._generated;
    assert.ok(generated1, '_generated must be present after first run');

    // Second run immediately — module content is stable.
    // Pre-fix: a fresh timestamp is written → generated2 !== generated1.
    // Post-fix: existing timestamp is reused → generated2 === generated1.
    const run2 = spawnSync(process.execPath, [DEP_GRAPH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    assert.equal(
      run2.status,
      0,
      `Second run failed (status ${run2.status}):\n${run2.stderr}\n${run2.stdout}`,
    );

    const generated2 = JSON.parse(readFileSync(OUT, 'utf8'))._generated;
    assert.equal(
      generated2,
      generated1,
      `_generated changed between consecutive runs on stable content: ${generated1} → ${generated2}`,
    );
  });
});
