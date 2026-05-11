/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove renderLocalMd and renderMicroMd produce slim adapters within hard token caps and free of Claude-class concepts.
 * @sidecar agent-contract-sync.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const syncModuleUrl = path
  .join(ROOT, 'scripts', 'agent-contract', 'sync.mjs')
  .replaceAll('\\', '/')
  .replace(/^([A-Z]):/, (_, d) => `file:///${d}:`);
const checkModuleUrl = path
  .join(ROOT, 'scripts', 'agent-contract', 'check.mjs')
  .replaceAll('\\', '/')
  .replace(/^([A-Z]):/, (_, d) => `file:///${d}:`);

const {
  renderLocalMd,
  renderMicroMd,
  loadContract,
  stripLeadingInlineHeader,
  readRepoVersion,
  collectLocalTierEquivalents,
} = await import(syncModuleUrl);
const {
  LOCAL_TOKEN_HARD_CAP,
  MICRO_TOKEN_HARD_CAP,
  SIGNATURE_NEEDLE,
  ROOT: CHECK_ROOT,
  approximateTokenCount,
  validateLocalAdapter,
  validateMicroAdapter,
  validateLocalTierEquivalents,
} = await import(checkModuleUrl);

const FORBIDDEN_LOCAL_CONCEPTS = ['subagent', 'MCP', 'slash command'];

const contract = await loadContract();

function tokens(text) {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}

test('renderLocalMd: output is under the hard cap', () => {
  const out = renderLocalMd(contract);
  assert.ok(tokens(out) <= LOCAL_TOKEN_HARD_CAP, `LOCAL.md is ${tokens(out)} tokens — over cap`);
});

test('renderLocalMd: includes canonical signature comment', () => {
  const out = renderLocalMd(contract);
  assert.ok(out.includes(SIGNATURE_NEEDLE), 'missing canonical signature');
});

test('renderLocalMd: references the agentProfiles capability tiers', () => {
  const out = renderLocalMd(contract);
  assert.ok(out.includes('mid'), 'missing mid-tier reference');
  assert.ok(out.includes('small'), 'missing small-tier reference');
  assert.ok(out.includes('Capability tier'), 'missing capability-tier section heading');
});

test('renderLocalMd: omits Claude-class concepts (subagent / MCP / slash command)', () => {
  const out = renderLocalMd(contract);
  for (const concept of FORBIDDEN_LOCAL_CONCEPTS) {
    assert.ok(
      !out.toLowerCase().includes(concept.toLowerCase()),
      `LOCAL.md must omit "${concept}" (would assume Claude-class harness)`,
    );
  }
});

test('renderLocalMd: includes coordination, commit ceremony, and module-fit guidance', () => {
  const out = renderLocalMd(contract);
  assert.ok(out.includes('claim-check'), 'missing coordination guidance');
  assert.ok(out.includes('coa-merge'), 'missing commit-ceremony guidance');
  assert.ok(out.includes('ADR-0013'), 'missing module-fit reference');
  assert.ok(out.includes('ADR-0009'), 'missing header-discipline reference');
});

test('renderLocalMd: is deterministic — same contract input yields identical output', () => {
  const a = renderLocalMd(contract);
  const b = renderLocalMd(contract);
  assert.equal(a, b);
});

test('renderMicroMd: output is under the hard cap', () => {
  const out = renderMicroMd(contract);
  assert.ok(tokens(out) <= MICRO_TOKEN_HARD_CAP, `MICRO.md is ${tokens(out)} tokens — over cap`);
});

test('renderMicroMd: includes canonical signature comment', () => {
  const out = renderMicroMd(contract);
  assert.ok(out.includes(SIGNATURE_NEEDLE), 'missing canonical signature');
});

test('renderMicroMd: covers commit shape, header sidecar, CHANGELOG, stop conditions', () => {
  const out = renderMicroMd(contract);
  assert.ok(out.includes('Commit message'), 'missing commit-message section');
  assert.ok(out.includes('@HEADER'), 'missing inline header example');
  assert.ok(out.includes('CHANGELOG'), 'missing CHANGELOG guidance');
  assert.ok(out.includes('Stop conditions'), 'missing stop-conditions section');
});

test('renderMicroMd: is deterministic', () => {
  const a = renderMicroMd(contract);
  const b = renderMicroMd(contract);
  assert.equal(a, b);
});

test('renderMicroMd: refuses to claim slice ownership (defers to operator)', () => {
  const out = renderMicroMd(contract);
  assert.ok(out.includes('NOT a slice owner'), 'MICRO.md must explicitly disclaim slice ownership');
});

test('approximateTokenCount: empty input returns 0', () => {
  assert.equal(approximateTokenCount(''), 0);
  assert.equal(approximateTokenCount(null), 0);
  assert.equal(approximateTokenCount(undefined), 0);
});

test('approximateTokenCount: ceil-divides bytes by 4', () => {
  assert.equal(approximateTokenCount('a'), 1);
  assert.equal(approximateTokenCount('abcd'), 1);
  assert.equal(approximateTokenCount('abcde'), 2);
});

test('validateLocalAdapter: rejects empty input', () => {
  const errs = [];
  validateLocalAdapter('', LOCAL_TOKEN_HARD_CAP, (m) => errs.push(m));
  assert.ok(errs.length > 0, 'should flag empty LOCAL.md');
});

test('validateLocalAdapter: rejects missing signature', () => {
  const errs = [];
  validateLocalAdapter('# LOCAL\n\nNo signature here.', LOCAL_TOKEN_HARD_CAP, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('canonical signature')), `expected signature error: ${errs.join('; ')}`);
});

test('validateLocalAdapter: rejects oversized input', () => {
  const oversized = `<!-- ${SIGNATURE_NEEDLE} -->\n` + 'x'.repeat(LOCAL_TOKEN_HARD_CAP * 4 + 100);
  const errs = [];
  validateLocalAdapter(oversized, LOCAL_TOKEN_HARD_CAP, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('hard cap')), `expected cap error: ${errs.join('; ')}`);
});

test('validateMicroAdapter: rejects oversized input', () => {
  const oversized = `<!-- ${SIGNATURE_NEEDLE} -->\n` + 'x'.repeat(MICRO_TOKEN_HARD_CAP * 4 + 100);
  const errs = [];
  validateMicroAdapter(oversized, MICRO_TOKEN_HARD_CAP, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('hard cap')), `expected cap error: ${errs.join('; ')}`);
});

test('round-trip: generated LOCAL.md on disk passes the same validator', async () => {
  const text = await readFile(path.join(ROOT, 'LOCAL.md'), 'utf8');
  const errs = [];
  validateLocalAdapter(text, LOCAL_TOKEN_HARD_CAP, (m) => errs.push(m));
  assert.deepEqual(errs, [], `LOCAL.md on disk should validate clean: ${errs.join('; ')}`);
  assert.ok(text.includes('Capability tier'), 'on-disk LOCAL.md missing tier section');
});

test('stripLeadingInlineHeader: removes only the leading @HEADER block', () => {
  const stamped = '<!-- @HEADER\n@version 0.7.22\n@purpose foo\n -->\n\n# body\nhello';
  assert.equal(stripLeadingInlineHeader(stamped), '# body\nhello');
});

test('stripLeadingInlineHeader: returns input unchanged when no header is present', () => {
  const plain = '# body\n\nno header here.';
  assert.equal(stripLeadingInlineHeader(plain), plain);
});

test('stripLeadingInlineHeader: preserves later HTML comments', () => {
  const stamped =
    '<!-- @HEADER\n@version x -->\n<!-- generated from compatibility-contract.json — do not edit by hand -->\n# body';
  const stripped = stripLeadingInlineHeader(stamped);
  assert.ok(stripped.startsWith('<!-- generated'), `expected later comment preserved, got: ${stripped}`);
});

test('round-trip: generated MICRO.md on disk passes the same validator', async () => {
  const text = await readFile(path.join(ROOT, 'MICRO.md'), 'utf8');
  const errs = [];
  validateMicroAdapter(text, MICRO_TOKEN_HARD_CAP, (m) => errs.push(m));
  assert.deepEqual(errs, [], `MICRO.md on disk should validate clean: ${errs.join('; ')}`);
});

test('readRepoVersion: returns the live VERSION file content', async () => {
  const versionText = (await readFile(path.join(ROOT, 'VERSION'), 'utf8')).trim();
  assert.equal(readRepoVersion(), versionText);
  assert.match(readRepoVersion(), /^\d+\.\d+\.\d+/);
});

test('readRepoVersion: prefers VERSION over package.json when both present', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'agent-contract-version-'));
  try {
    writeFileSync(path.join(dir, 'VERSION'), '9.9.9\n', 'utf8');
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '1.1.1' }), 'utf8');
    assert.equal(readRepoVersion(dir), '9.9.9');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readRepoVersion: falls back to package.json when VERSION is missing', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'agent-contract-version-'));
  try {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '2.3.4' }), 'utf8');
    assert.equal(readRepoVersion(dir), '2.3.4');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readRepoVersion: falls back to package.json when VERSION is empty', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'agent-contract-version-'));
  try {
    writeFileSync(path.join(dir, 'VERSION'), '   \n', 'utf8');
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '4.5.6' }), 'utf8');
    assert.equal(readRepoVersion(dir), '4.5.6');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readRepoVersion: returns 0.0.0 when neither VERSION nor package.json is present', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'agent-contract-version-'));
  try {
    assert.equal(readRepoVersion(dir), '0.0.0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readRepoVersion: returns 0.0.0 when package.json is malformed and VERSION is missing', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'agent-contract-version-'));
  try {
    writeFileSync(path.join(dir, 'package.json'), '{ not valid json', 'utf8');
    assert.equal(readRepoVersion(dir), '0.0.0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('contract: sync.mjs no longer hardcodes the bootstrap "0.1.32" literal', async () => {
  const source = await readFile(path.join(ROOT, 'scripts', 'agent-contract', 'sync.mjs'), 'utf8');
  assert.ok(
    !source.includes("'0.1.32'") && !source.includes('"0.1.32"'),
    'sync.mjs must derive the version from VERSION/package.json, not hardcode "0.1.32"',
  );
});

test('contract: sync.mjs no longer hardcodes the bootstrap "2026-03-22" date', async () => {
  const source = await readFile(path.join(ROOT, 'scripts', 'agent-contract', 'sync.mjs'), 'utf8');
  assert.ok(
    !source.includes("'2026-03-22'") && !source.includes('"2026-03-22"'),
    'sync.mjs must compute the date dynamically, not hardcode "2026-03-22"',
  );
});

test('regenerated AGENTS.md: header carries the live VERSION (not the bootstrap literal)', async () => {
  const text = await readFile(path.join(ROOT, 'AGENTS.md'), 'utf8');
  // Check that @version is present and not the bootstrap literal. Exact-version
  // matching is intentionally omitted: during a pre-commit ceremony the VERSION
  // file is bumped before the commit but the post-commit hook stamps @version
  // after, so the two values legitimately differ by one patch during that window.
  assert.ok(/@version \d+\.\d+\.\d+/.test(text), 'AGENTS.md header must carry a semver @version stamp');
  assert.ok(!text.includes('0.1.32'), 'AGENTS.md must not retain the bootstrap "0.1.32" stamp');
});

// ============================================================================
// TPL-212 — localTierEquivalent field on roles/skills + LOCAL.md equivalents section
// ============================================================================

const LOCAL_TIER_EQUIV_VALID = {
  command: 'node scripts/checks/header-fix.mjs --changed',
  scope: 'Repair sidecars for files in current diff.',
  limits: 'Cannot decide WHICH files need new sidecars.',
};

const pkgScripts = JSON.parse(
  await readFile(path.join(CHECK_ROOT, 'package.json'), 'utf8'),
).scripts ?? {};

function fakeContract(roles = [], skills = []) {
  return {
    schemaVersion: 3,
    roles,
    skills,
  };
}

test('validateLocalTierEquivalents: accepts roles/skills with no field set', () => {
  const errs = [];
  const contract = fakeContract([{ name: 'r1', capabilityTier: 'frontier' }], [{ name: 's1', capabilityTier: 'frontier' }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.deepEqual(errs, [], `expected no errors, got: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: accepts a valid node-script equivalent', () => {
  const errs = [];
  const contract = fakeContract([], [{ name: 's1', capabilityTier: 'small', localTierEquivalent: { ...LOCAL_TIER_EQUIV_VALID } }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.deepEqual(errs, [], `expected no errors, got: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: accepts a valid pnpm-script equivalent when the script exists', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'mid',
    localTierEquivalent: {
      command: 'pnpm test:bdd',
      scope: 'Run BDD scenarios.',
      limits: 'Authoring scenarios is reasoning.',
    },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.deepEqual(errs, [], `expected no errors, got: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects a pnpm script that does not exist in package.json', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'mid',
    localTierEquivalent: {
      command: 'pnpm does-not-exist',
      scope: 'X.',
      limits: 'Y.',
    },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('does not exist')), `expected target-missing error: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects empty command', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: { command: '', scope: 'x', limits: 'y' },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('command')), `expected command error: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects shell pipeline (&&)', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: {
      command: 'node scripts/checks/header-fix.mjs && node scripts/checks/readme-fix.mjs',
      scope: 'x',
      limits: 'y',
    },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('invocable directly')), `expected pipeline rejection: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects shell pipe (|)', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: {
      command: 'node scripts/checks/header-fix.mjs | grep error',
      scope: 'x',
      limits: 'y',
    },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('invocable directly')), `expected pipe rejection: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects redirect (>)', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: {
      command: 'node scripts/checks/header-fix.mjs > out.log',
      scope: 'x',
      limits: 'y',
    },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('invocable directly')), `expected redirect rejection: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects command not starting with node or pnpm', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: {
      command: 'bash scripts/checks/header-fix.mjs',
      scope: 'x',
      limits: 'y',
    },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('node ') || e.includes('pnpm ')), `expected prefix rejection: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects missing-file node command', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: {
      command: 'node scripts/checks/does-not-exist.mjs',
      scope: 'x',
      limits: 'y',
    },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('does not exist')), `expected missing-file rejection: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects empty scope', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: { ...LOCAL_TIER_EQUIV_VALID, scope: '' },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('scope')), `expected scope error: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects empty limits', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: { ...LOCAL_TIER_EQUIV_VALID, limits: '' },
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('limits')), `expected limits error: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: rejects non-object value', () => {
  const errs = [];
  const contract = fakeContract([], [{
    name: 's1',
    capabilityTier: 'small',
    localTierEquivalent: 'node scripts/foo.mjs',
  }]);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('object')), `expected object-type error: ${errs.join('; ')}`);
});

test('validateLocalTierEquivalents: also covers roles[]', () => {
  const errs = [];
  const contract = fakeContract([{
    name: 'r1',
    capabilityTier: 'mid',
    localTierEquivalent: { command: 'node scripts/checks/does-not-exist.mjs', scope: 'x', limits: 'y' },
  }], []);
  validateLocalTierEquivalents(contract, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.ok(errs.some((e) => e.includes('does not exist')), `expected missing-file rejection on role: ${errs.join('; ')}`);
});

test('collectLocalTierEquivalents: separates equipped roles/skills from reasoning-only ones', () => {
  const contract = fakeContract([
    { name: 'role-with', localTierEquivalent: { command: 'node x', scope: 's', limits: 'l' } },
    { name: 'role-without' },
  ], [
    { name: 'skill-with', localTierEquivalent: { command: 'node y', scope: 's', limits: 'l' } },
    { name: 'skill-without' },
  ]);
  const { equipped, reasoningOnly } = collectLocalTierEquivalents(contract);
  assert.equal(equipped.length, 2);
  assert.equal(equipped[0].name, 'role-with');
  assert.equal(equipped[0].kind, 'role');
  assert.equal(equipped[1].name, 'skill-with');
  assert.equal(equipped[1].kind, 'skill');
  assert.equal(reasoningOnly.length, 2);
  assert.equal(reasoningOnly[0].name, 'role-without');
  assert.equal(reasoningOnly[1].name, 'skill-without');
});

test('renderLocalMd: emits the equivalents section when the live contract has at least one entry', () => {
  const out = renderLocalMd(contract);
  assert.ok(
    out.includes('Local-tier equivalents'),
    'live contract has localTierEquivalent entries — section should render',
  );
});

test('renderLocalMd: equivalents section does NOT render when every entry omits the field', () => {
  const stripped = {
    ...contract,
    roles: contract.roles.map((r) => {
      const { localTierEquivalent: _eq, ...rest } = r;
      return rest;
    }),
    skills: contract.skills.map((s) => {
      const { localTierEquivalent: _eq, ...rest } = s;
      return rest;
    }),
  };
  const out = renderLocalMd(stripped);
  assert.ok(
    !out.includes('Local-tier equivalents'),
    'no localTierEquivalent entries — section should be omitted',
  );
});

test('renderLocalMd: equivalents section lists reasoning-only entries when present', () => {
  const out = renderLocalMd(contract);
  assert.ok(out.includes('Cannot run locally'), 'expected reasoning-only callout');
  assert.ok(out.includes('repo-architect'), 'expected repo-architect listed as reasoning-only');
  assert.ok(out.includes('feature-implementer'), 'expected feature-implementer listed as reasoning-only');
});

test('renderLocalMd: token count stays under hard cap after equivalents expansion', () => {
  const out = renderLocalMd(contract);
  assert.ok(
    tokens(out) <= LOCAL_TOKEN_HARD_CAP,
    `LOCAL.md is ${tokens(out)} tokens — over ${LOCAL_TOKEN_HARD_CAP} cap after TPL-212 expansion`,
  );
});

test('renderMicroMd: does NOT include the equivalents table (MICRO stays narrow)', () => {
  const out = renderMicroMd(contract);
  assert.ok(!out.includes('Local-tier equivalents'), 'MICRO.md must not surface the equivalents table');
});

test('on-disk LOCAL.md: includes the regenerated equivalents section', async () => {
  const text = await readFile(path.join(ROOT, 'LOCAL.md'), 'utf8');
  assert.ok(text.includes('Local-tier equivalents'), 'on-disk LOCAL.md missing equivalents section');
  assert.ok(text.includes('node scripts/checks/header-fix.mjs --changed'), 'expected header-sidecar mapping in regenerated LOCAL.md');
});

test('contract: live schemaVersion is at least 3 (TPL-212 bump)', async () => {
  const live = await loadContract();
  assert.ok(typeof live.schemaVersion === 'number' && live.schemaVersion >= 3,
    `expected schemaVersion >= 3 after TPL-212, got ${live.schemaVersion}`);
});

test('contract: every localTierEquivalent on disk validates clean against the schema', async () => {
  const live = await loadContract();
  const errs = [];
  validateLocalTierEquivalents(live, CHECK_ROOT, pkgScripts, (m) => errs.push(m));
  assert.deepEqual(errs, [], `live contract should validate clean: ${errs.join('; ')}`);
});
