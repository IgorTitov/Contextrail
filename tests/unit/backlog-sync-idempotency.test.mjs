/* @HEADER
 * @version 0.8.9 | 2026-05-11
 * @purpose Regression proof for TPL-331: backlog-sync --check must exit 0 on second run when content is stable (timestamp idempotency).
 * @sidecar backlog-sync-idempotency.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-331 — backlog-sync timestamp idempotency regression test.
 *
 * Before the fix, renderMarkdown() always embedded a fresh new Date() timestamp
 * in the markdown output. The `changed` comparison used `currentMd !== md`,
 * which saw T1 (stored file) vs T2 (freshly generated) as always different —
 * even when no backlog items changed. This caused every `--check` invocation
 * on a stable repo to report "out of date."
 *
 * After the fix:
 * - renderMarkdown() accepts an injected `generatedAt` timestamp.
 * - `payload.generatedAt` is preserved from the existing JSON when content is
 *   stable (same items), so the injected timestamp matches the stored file.
 * - `stripGeneratedLine()` normalizes the "Generated:" line before comparison
 *   as a safety net for edge cases.
 *
 * This test proves the fix: run backlog-sync twice in a temp directory;
 * the second `--check` run must exit 0.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const BACKLOG_SYNC = join(REPO_ROOT, 'scripts', 'checks', 'backlog-sync.mjs');

describe('backlog-sync timestamp idempotency — TPL-331', () => {
  test('--check exits 0 on second run when backlog content is stable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl-331-backlog-'));
    try {
      // First run: empty repo (no docs/backlog/ dir), so 0 items.
      // Script creates docs/backlog/_generated/ and writes the output files.
      const run1 = spawnSync(process.execPath, [BACKLOG_SYNC], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.equal(
        run1.status,
        0,
        `First run failed (status ${run1.status}):\n${run1.stderr}\n${run1.stdout}`,
      );

      // Second run with --check: content is stable (same 0 items).
      // Pre-fix: renderMarkdown() generated a fresh timestamp → currentMd !== md → exit 1.
      // Post-fix: payload.generatedAt preserved from JSON → same timestamp → exit 0.
      const run2 = spawnSync(process.execPath, [BACKLOG_SYNC, '--check'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.equal(
        run2.status,
        0,
        `Second --check run exited ${run2.status} (expected 0 — stable content should not be "out of date"):\n${run2.stderr}\n${run2.stdout}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
