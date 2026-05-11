/* @HEADER
 * @version 0.7.123 | 2026-05-06
 * @purpose Integration coverage for sidecar-referents-check (TPL-316) — verifies fileId/tests/module referent integrity, advisory mode, hard-fail promotion, malformed-skip, and audit vs pre-commit modes.
 * @sidecar sidecar-referents-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = resolve(ROOT, 'scripts', 'checks', 'sidecar-referents-check.mjs');

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'sidecar-ref-'));
  return dir;
}

function writeFile(root, relPath, content) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

function runCheck(cwd, args = [], env = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root=' + cwd, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

test('pass: all referents resolve', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'modules/auth/public-api.mjs', 'export {};\n');
  writeFile(dir, 'tests/unit/auth.test.mjs', '// test\n');
  writeFile(
    dir,
    'modules/auth/public-api.mjs.header.md',
    `---
fileId: contextrail-template:modules:auth:public-api
module: modules/auth
tests:
  - tests/unit/auth.test.mjs
---

# public-api.mjs
`,
  );

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0, `expected exit 0, got ${r.code}\nstderr:\n${r.stderr}`);
  assert.ok(!/WARN/i.test(r.stderr), 'should emit no warnings');
});

test('pass: minimal sidecar (just summary, no referents)', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'apps/starter/foo.mjs', '// foo\n');
  writeFile(
    dir,
    'apps/starter/foo.mjs.header.md',
    `---
summary: A small file with no referents
---

# foo.mjs
`,
  );

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0, `expected exit 0, got ${r.code}\nstderr:\n${r.stderr}`);
  assert.ok(!/WARN/i.test(r.stderr));
});

test('warn: fileId mismatch (F9 hallucination shape)', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'apps/starter/sample.mjs', '// sample\n');
  // Devstral fabrication: kebab-case synthetic ID, not the path-as-colons convention.
  writeFile(
    dir,
    'apps/starter/sample.mjs.header.md',
    `---
fileId: sample-mjs-header
---

# sample.mjs
`,
  );

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0, 'advisory mode → exit 0 even with warnings');
  assert.match(r.stderr, /fileId/i, 'stderr names fileId');
  assert.match(r.stderr, /sample-mjs-header/, 'stderr cites the bad value');
  assert.match(
    r.stderr,
    /contextrail-template:apps:starter:sample/,
    'stderr cites the expected derived value',
  );
});

test('warn: tests entry missing on disk', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'apps/starter/sample.mjs', '// sample\n');
  writeFile(
    dir,
    'apps/starter/sample.mjs.header.md',
    `---
tests: tests/unit/nonexistent.test.mjs
---

# sample.mjs
`,
  );

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /tests/i);
  assert.match(r.stderr, /nonexistent/);
});

test('warn: tests list mixed valid/invalid → only invalid reported', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'apps/starter/sample.mjs', '// sample\n');
  writeFile(dir, 'tests/unit/sample.test.mjs', '// real\n');
  writeFile(
    dir,
    'apps/starter/sample.mjs.header.md',
    `---
tests:
  - tests/unit/sample.test.mjs
  - tests/unit/missing.test.mjs
---

# sample.mjs
`,
  );

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /missing\.test\.mjs/);
  // Valid entry should NOT appear as a warning subject.
  const warnLines = r.stderr.split('\n').filter((l) => /WARN/.test(l));
  assert.ok(
    !warnLines.some((l) => /\bsample\.test\.mjs\b/.test(l) && !/missing/.test(l)),
    `valid entry should not be flagged; warnLines:\n${warnLines.join('\n')}`,
  );
});

test('warn: module directory missing', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'apps/starter/sample.mjs', '// sample\n');
  writeFile(
    dir,
    'apps/starter/sample.mjs.header.md',
    `---
module: modules/nonexistent
---

# sample.mjs
`,
  );

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /module/i);
  assert.match(r.stderr, /nonexistent/);
});

test('hard-fail mode: COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1 + warnings → exit 1', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'apps/starter/sample.mjs', '// sample\n');
  writeFile(
    dir,
    'apps/starter/sample.mjs.header.md',
    `---
fileId: wrong-id
---

# sample.mjs
`,
  );

  const advisory = runCheck(dir, ['--audit']);
  assert.equal(advisory.code, 0, 'advisory mode is exit 0');

  const promoted = runCheck(dir, ['--audit'], {
    COA_OPERATOR_PROMOTE_SIDECAR_CHECK: '1',
  });
  assert.notEqual(promoted.code, 0, 'promotion env → non-zero exit');
});

test('skip: malformed sidecar reported and other sidecars still checked', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  // Malformed: opening --- but no closing one.
  writeFile(dir, 'apps/starter/bad.mjs', '// bad\n');
  writeFile(
    dir,
    'apps/starter/bad.mjs.header.md',
    `---
fileId: contextrail-template:apps:starter:bad
this never closes
`,
  );

  // Good neighbour with a deliberate fileId mismatch — must still be detected.
  writeFile(dir, 'apps/starter/good.mjs', '// good\n');
  writeFile(
    dir,
    'apps/starter/good.mjs.header.md',
    `---
fileId: totally-wrong
---

# good.mjs
`,
  );

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0, 'malformed should not crash');
  assert.match(r.stderr, /could not parse|malformed/i, 'reports malformed sidecar');
  assert.match(r.stderr, /totally-wrong/, 'still flags the good neighbour mismatch');
});

test('audit mode walks all sidecars in the fixture', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'a/x.mjs', '');
  writeFile(dir, 'a/x.mjs.header.md', '---\nfileId: wrong-a\n---\n');
  writeFile(dir, 'b/y.mjs', '');
  writeFile(dir, 'b/y.mjs.header.md', '---\nfileId: wrong-b\n---\n');

  const r = runCheck(dir, ['--audit']);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /wrong-a/);
  assert.match(r.stderr, /wrong-b/);
});

test('pre-commit mode (no --audit) uses --staged list, not full walk', (t) => {
  const dir = makeFixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeFile(dir, 'a/x.mjs', '');
  writeFile(dir, 'a/x.mjs.header.md', '---\nfileId: wrong-a\n---\n');
  writeFile(dir, 'b/y.mjs', '');
  writeFile(dir, 'b/y.mjs.header.md', '---\nfileId: wrong-b\n---\n');

  // Only stage a/x.mjs.header.md — b/y must not be checked.
  const r = runCheck(dir, ['--staged=a/x.mjs.header.md']);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /wrong-a/);
  assert.ok(!/wrong-b/.test(r.stderr), 'unstaged sidecar must not be checked');
});
