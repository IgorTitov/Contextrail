/* @HEADER
 * @version 0.8.0 | 2026-05-07
 * @purpose Block implementation-oriented changes when the changed files are not linked to ready work items with the required PRD and USM coverage.
 * @sidecar pre-impl-gate.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { collectWorkItems, parseArgs, readText, result, resolveMainRepoRoot } from './_shared.mjs';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ValidationError } from '../lib/errors.mjs';
import { parseClaim, filterActiveClaims, detectOverlaps } from './claim-check.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const errors = [];

const READY_STATUSES = new Set(['todo', 'in-progress', 'blocked', 'validating', 'done']);
const USER_FACING_TYPES = new Set([
  'story',
  'feature',
  'user_story',
  'job_story',
  'workflow_story',
  'ui_story',
]);
const IMPLEMENTATION_ROOTS = ['apps/', 'packages/', 'modules/', 'services/', 'src/'];
const PROOF_ROOTS = ['tests/unit/', 'tests/bdd/', 'tests/e2e/'];

function gitLines(args) {
  const run = spawnSync('git', args, { encoding: 'utf8', shell: false });
  if (run.status !== 0) return [];
  return String(run.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replaceAll('\\', '/'));
}

function hasGitWorkTree() {
  const run = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    encoding: 'utf8',
    shell: false,
  });
  return run.status === 0 && String(run.stdout || '').trim() === 'true';
}

function hasBaselineCommit() {
  const run = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {
    encoding: 'utf8',
    shell: false,
  });
  return run.status === 0;
}

function stagedFilesFromGit() {
  return gitLines(['diff', '--name-only', '--cached', '--diff-filter=ACMR']);
}

function changedFilesFromGit() {
  return [
    ...new Set([
      ...gitLines(['diff', '--name-only', '--cached', '--diff-filter=ACMR']),
      ...gitLines(['diff', '--name-only', '--diff-filter=ACMR']),
      ...gitLines(['ls-files', '--others', '--exclude-standard']),
    ]),
  ].sort();
}

// In pre-commit context, only check staged files — unstaged changes belong
// to other parallel sessions and must not block this commit.
const fromPreCommit = process.env.COA_PRE_COMMIT === '1';

function fail(message) {
  errors.push(new ValidationError(message));
}

function isImplementationOrProofFile(file) {
  const posix = String(file).replaceAll('\\', '/');
  return (
    IMPLEMENTATION_ROOTS.some((root) => posix.startsWith(root)) ||
    PROOF_ROOTS.some((root) => posix.startsWith(root))
  );
}

function extractSpecRefsFromHeaders(text) {
  const refs = [];
  const source = String(text);
  // Legacy form: `SpecRefs: TPL-001` (capital S, optional comment marker prefix).
  for (const match of source.matchAll(/^\s*(?:#|\/\/|\*|<!--)?\s*SpecRefs:\s*(.+)$/gm)) {
    const raw = match[1].trim()
      .replace(/\s*-->$/g, '')   // strip HTML comment closer
      .replace(/\s*\*\/$/g, ''); // strip block comment closer
    if (!raw || raw === '_none_') continue;
    refs.push(
      ...raw
        .split(/[;,]/)
        .map((x) => x.trim())
        .filter(Boolean),
    );
  }
  // ADR-0009 sparse-sidecar form: YAML `specRefs:` (camelCase) as either a scalar
  // (`specRefs: TPL-001`) or a block list (`specRefs:\n  - TPL-001\n  - TPL-002`).
  const scalarMatch = source.match(/^specRefs:[ \t]+([^\s\n][^\n]*)$/m);
  if (scalarMatch && scalarMatch[1].trim() !== '_none_') {
    refs.push(
      ...scalarMatch[1]
        .split(/[;,]/)
        .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean),
    );
  }
  const listMatch = source.match(/^specRefs:\s*\n((?:[ \t]+-[^\n]*\n?)+)/m);
  if (listMatch) {
    for (const line of listMatch[1].split('\n')) {
      const item = line.replace(/^[ \t]+-\s*/, '').trim();
      if (item && item !== '_none_') refs.push(item.replace(/^['"]|['"]$/g, ''));
    }
  }
  return [...new Set(refs)];
}

/**
 * Advisory claim check: load .claims/*.json and report overlaps as warnings.
 * Phase 1 — never blocks, only warns.
 */
async function advisoryClaimCheck(targetFiles) {
  const warnings = [];
  const claimsDir = join(resolveMainRepoRoot(), '.claims');
  let files;
  try {
    files = await readdir(claimsDir);
  } catch {
    return warnings; // .claims/ doesn't exist — nothing to check
  }
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  if (jsonFiles.length === 0) return warnings;

  const claims = [];
  for (const f of jsonFiles) {
    const text = await readFile(join(claimsDir, f), 'utf8').catch(() => '');
    const claim = parseClaim(text, f);
    if (claim) claims.push(claim);
  }

  const activeClaims = filterActiveClaims(claims);
  if (activeClaims.length === 0) return warnings;

  const crossModuleFiles = targetFiles.filter((f) => f.startsWith('modules/'));
  if (crossModuleFiles.length === 0) return warnings;

  const overlaps = detectOverlaps(activeClaims, crossModuleFiles, 'modify');
  for (const o of overlaps) {
    const severity =
      o.severity === 'conflict' ? 'CONFLICT' : o.severity === 'nearby' ? 'NEARBY' : 'ADVISORY';
    warnings.push(
      `claim-check ${severity}: ${o.claimId} (${o.agent}) targets ${o.path} [${o.claimAction}]`,
    );
  }
  return warnings;
}

async function main() {
  const gitWorkTree = hasGitWorkTree();
  const baselineCommit = gitWorkTree && hasBaselineCommit();

  const [pkgText, changedFiles, items] = await Promise.all([
    readText('package.json'),
    Promise.resolve(
      gitWorkTree && baselineCommit
        ? (fromPreCommit ? stagedFilesFromGit() : changedFilesFromGit())
        : [],
    ),
    collectWorkItems(),
  ]);

  const pkg = JSON.parse(pkgText);
  if (pkg.scripts?.['pre-impl-gate'] !== 'node scripts/checks/pre-impl-gate.mjs') {
    fail('package.json is missing script pre-impl-gate -> node scripts/checks/pre-impl-gate.mjs');
  }

  const BULK_THRESHOLD = 25;
  const targetFiles = changedFiles.filter(isImplementationOrProofFile);
  const isBulkOperation = targetFiles.length > BULK_THRESHOLD;
  if (!gitWorkTree || !baselineCommit || targetFiles.length === 0 || isBulkOperation) {
    const reason = !gitWorkTree
      ? 'no git work tree detected'
      : !baselineCommit
        ? 'no baseline commit detected'
        : isBulkOperation
          ? `bulk template operation detected (${targetFiles.length} implementation files exceed threshold of ${BULK_THRESHOLD})`
          : 'no implementation-oriented changed files detected';
    const output = result('pre-impl-gate', true, [], [], { skipped: true, reason });
    if (wantJson) console.log(JSON.stringify(output, null, 2));
    else console.log(`pre-impl-gate: OK (${reason})`);
    return;
  }

  const itemById = new Map(items.map((item) => [String(item.id), item]));
  const referencedItems = new Map();

  for (const file of targetFiles) {
    const text = await readText(file).catch(() => '');
    const sidecarText = await readText(`${file}.header.md`).catch(() => '');
    const refs = extractSpecRefsFromHeaders(text + '\n' + sidecarText);
    if (refs.length === 0) {
      fail(
        `${file}: changed implementation/proof file must declare at least one header SpecRef to a ready work item`,
      );
      continue;
    }
    for (const ref of refs) {
      const item = itemById.get(ref);
      if (!item) {
        fail(`${file}: header SpecRef ${ref} does not resolve to a known work item`);
        continue;
      }
      referencedItems.set(ref, item);
    }
  }

  for (const [id, item] of referencedItems.entries()) {
    const status = String(item.status || '').trim();
    if (!READY_STATUSES.has(status)) {
      fail(
        `${item.source_file}: work item ${id} must be ready before implementation; current status is ${status || '(missing)'}`,
      );
    }
    if (!Array.isArray(item.acceptance) || item.acceptance.length === 0) {
      fail(
        `${item.source_file}: work item ${id} must declare at least one acceptance criterion before implementation`,
      );
    }

    const specRefs = Array.isArray(item.spec_refs) ? item.spec_refs : [];
    const hasPrdRef = specRefs.some((ref) => String(ref).startsWith('docs/prd/'));
    if (!hasPrdRef) {
      fail(`${item.source_file}: work item ${id} must reference docs/prd/* before implementation`);
    }

    const type = String(item.type || '').trim();
    if (USER_FACING_TYPES.has(type)) {
      const hasUsmRef = specRefs.some((ref) => String(ref).startsWith('docs/usm/'));
      if (!hasUsmRef) {
        fail(
          `${item.source_file}: user-facing work item ${id} (${type}) must reference docs/usm/* before implementation`,
        );
      }
      if (!Array.isArray(item.bdd_refs) || item.bdd_refs.length === 0) {
        fail(
          `${item.source_file}: user-facing work item ${id} (${type}) must declare at least one bdd_ref before implementation`,
        );
      }
    }
  }

  // --- Advisory claim check for cross-module files (Phase 1: warnings only) ---
  const claimWarnings = await advisoryClaimCheck(targetFiles);

  const output = result('pre-impl-gate', errors.length === 0, errors, claimWarnings, {
    changedImplementationFileCount: targetFiles.length,
    referencedItemCount: referencedItems.size,
    changedImplementationFiles: targetFiles,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    console.error('pre-impl-gate failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'));
    process.exit(1);
  }

  console.log('pre-impl-gate: OK');
}

main().catch((error) => {
  const output = result('pre-impl-gate', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
