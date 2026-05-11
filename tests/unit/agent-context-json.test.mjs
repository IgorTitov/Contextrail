/* @HEADER
 * @version 0.7.108 | 2026-05-06
 * @purpose Unit tests for agent-context.mjs --format=json flag and pnpm context:brief shortcut (TPL-295).
 * @sidecar agent-context-json.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-295

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs } from '../../scripts/agent-context.mjs';

const __dirname =
  import.meta.dirname ??
  (import.meta.url ? fileURLToPath(import.meta.url).replace(/[/\\][^/\\]+$/, '') : process.cwd());
const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'agent-context.mjs');

const AUTH_FILE = 'modules/auth/domain/auth-state.mjs';

const EXPECTED_HEADINGS = [
  '# Slice context',
  '## How to read this brief',
  '## Architectural map',
  '## Module manifests',
  '## Sidecar neighborhood',
  '## Touched files (full source)',
  '## Suggested next actions',
  '## Token budget',
];

function run(args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}

function runSafe(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}

// ---------------------------------------------------------------------------
// parseArgs extensions for --format and --explain
// ---------------------------------------------------------------------------

describe('parseArgs: --format and --explain', () => {
  it('default format is "markdown"', () => {
    const r = parseArgs(['--files=README.md', '--budget=1000']);
    assert.equal(r.format, 'markdown', 'default format must be "markdown"');
  });

  it('--format=markdown sets format to "markdown"', () => {
    const r = parseArgs(['--files=README.md', '--budget=1000', '--format=markdown']);
    assert.equal(r.format, 'markdown');
  });

  it('--format=md is accepted as alias', () => {
    const r = parseArgs(['--files=README.md', '--budget=1000', '--format=md']);
    assert.equal(r.format, 'md', '--format=md must be accepted');
  });

  it('--format=json sets format to "json"', () => {
    const r = parseArgs(['--files=README.md', '--budget=1000', '--format=json']);
    assert.equal(r.format, 'json');
  });

  it('--format=yaml throws with clear error (invalid format)', () => {
    assert.throws(
      () => parseArgs(['--files=README.md', '--budget=1000', '--format=yaml']),
      /invalid.*format/i,
      'invalid format must throw a clear error',
    );
  });

  it('--explain sets explain=true', () => {
    const r = parseArgs(['--files=README.md', '--budget=1000', '--explain']);
    assert.equal(r.explain, true, '--explain must set explain=true');
  });

  it('default explain is false', () => {
    const r = parseArgs(['--files=README.md', '--budget=1000']);
    assert.equal(r.explain, false, 'default explain must be false');
  });
});

// ---------------------------------------------------------------------------
// --format=json and --format=markdown CLI output
// ---------------------------------------------------------------------------

describe('--format CLI output', () => {
  it('default (no --format) emits markdown starting with "# Slice context"', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000']);
    assert.ok(out.startsWith('# Slice context'), 'default output must be markdown');
  });

  it('--format=markdown emits markdown starting with "# Slice context"', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=markdown']);
    assert.ok(out.startsWith('# Slice context'));
  });

  it('--format=md emits markdown (alias)', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=md']);
    assert.ok(out.startsWith('# Slice context'), '--format=md must emit markdown');
  });

  it('--format=json emits valid JSON (JSON.parse succeeds)', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=json']);
    assert.doesNotThrow(() => JSON.parse(out), '--format=json must emit valid JSON');
  });

  it('JSON has all required top-level keys', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=json']);
    const parsed = JSON.parse(out);
    const REQUIRED_KEYS = [
      'version',
      'slice',
      'files',
      'profile',
      'budget',
      'tiers',
      'totalTokens',
      'headings',
      'explain',
    ];
    for (const key of REQUIRED_KEYS) {
      assert.ok(key in parsed, `JSON must have top-level key "${key}"`);
    }
  });

  it('JSON tiers has tier1, tier2, tier3, tier4 sub-keys', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=json']);
    const { tiers } = JSON.parse(out);
    for (const tier of ['tier1', 'tier2', 'tier3', 'tier4']) {
      assert.ok(tier in tiers, `JSON tiers must have sub-key "${tier}"`);
    }
  });

  it('JSON totalTokens matches markdown ## Token budget Total line', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const mdOut = run([`--files=${AUTH_FILE}`, '--budget=16000']);
    const jsonOut = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=json']);
    const parsed = JSON.parse(jsonOut);
    const match = mdOut.match(/- Total: (\d+) tokens/);
    assert.ok(match, 'markdown must have "- Total: N tokens" line');
    const mdTotal = parseInt(match[1], 10);
    assert.equal(parsed.totalTokens, mdTotal, 'JSON totalTokens must match markdown total');
  });

  it('JSON explain is null without --explain flag', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=json']);
    const parsed = JSON.parse(out);
    assert.strictEqual(parsed.explain, null, 'explain must be null without --explain');
  });

  it('JSON explain is non-null with --explain and --format=json', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const out = run([`--files=${AUTH_FILE}`, '--budget=16000', '--format=json', '--explain']);
    const parsed = JSON.parse(out);
    assert.notEqual(parsed.explain, null, 'explain must be non-null when --explain is passed');
  });

  it('--format=yaml exits non-zero with clear error', () => {
    assert.ok(existsSync(join(ROOT, AUTH_FILE)), `test requires ${AUTH_FILE}`);
    const result = runSafe([`--files=${AUTH_FILE}`, '--budget=16000', '--format=yaml']);
    assert.notEqual(result.status, 0, 'invalid --format=yaml must exit non-zero');
    assert.match(
      result.stderr,
      /invalid.*format|format.*invalid/i,
      'error message must mention format',
    );
  });
});

// ---------------------------------------------------------------------------
// pnpm context:brief shortcut
// ---------------------------------------------------------------------------

describe('pnpm context:brief shortcut', () => {
  it('pnpm context:brief forwards args and emits all 8 stable headings (skip if pnpm not on PATH)', () => {
    // Graceful skip if pnpm not available (some CI environments)
    const pnpmCheck = spawnSync('pnpm', ['--version'], { encoding: 'utf8', shell: true });
    if (pnpmCheck.error || pnpmCheck.status !== 0) {
      // pnpm not available; skip this test
      return;
    }

    const result = spawnSync('pnpm', ['context:brief', `--files=README.md`, '--budget=64000'], {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
    });

    if (result.error) {
      // pnpm not runnable; skip
      return;
    }

    const out = result.stdout;
    for (const heading of EXPECTED_HEADINGS) {
      assert.ok(
        out.includes(heading),
        `pnpm context:brief output must contain heading "${heading}"`,
      );
    }
  });
});
