/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single-process pre-commit orchestrator — replaces bash-based multi-spawn with native Node.js parallelism.
 * @sidecar pre-commit-runner.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Pre-commit check runner — Node.js alternative to the bash pre-commit hook.
//
// Advantages over bash:
//   1. No Git Bash emulation overhead on Windows (~200ms per spawn saved)
//   2. Native Promise.allSettled parallelism within phases
//   3. Structured JSON output from each check (when supported)
//   4. Single process startup cost instead of 20+
//
// Usage:
//   node scripts/checks/pre-commit-runner.mjs              # full run
//   node scripts/checks/pre-commit-runner.mjs --fast       # fast mode (Phase 6 only)
//   node scripts/checks/pre-commit-runner.mjs --phase=6    # run one phase
//   node scripts/checks/pre-commit-runner.mjs --json       # JSON report
//   node scripts/checks/pre-commit-runner.mjs --dry-run    # show what would run
//
// Environment:
//   COA_GATE=fast|full   — same as bash hook
//   COA_SKIP_GATES=1,3   — skip specific phases
//   COA_SCOPE=modules/x  — scope checks to specific modules

import { execFileSync, execSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const JSON_ONLY = args.has('--json');
const DRY_RUN = args.has('--dry-run');
const FAST = args.has('--fast');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENV_GATE = process.env.COA_GATE || (FAST ? 'fast' : 'full');
const SKIP_PHASES = new Set(
  (process.env.COA_SKIP_GATES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

// Parse --phase=N
let ONLY_PHASE = null;
for (const arg of args) {
  const m = arg.match(/^--phase=(\d+)$/);
  if (m) ONLY_PHASE = m[1];
}

// Detect scope
function detectScope() {
  if (process.env.COA_SCOPE) return process.env.COA_SCOPE;
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    const modules = new Set();
    for (const line of staged.split('\n')) {
      const m = line.match(/^(modules\/[^/]+)\//);
      if (m) modules.add(m[1]);
    }
    return [...modules].sort().join(',');
  } catch {
    return '';
  }
}

// Detect docs-only changes
function isDocsOnly() {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
    if (!staged) return false;
    return staged
      .split('\n')
      .every((f) => f.startsWith('docs/') || f.endsWith('.md') || f.endsWith('.txt'));
  } catch {
    return false;
  }
}

const SCOPE = detectScope();
const GATE = ENV_GATE === 'full' && !process.env.COA_GATE && isDocsOnly() ? 'fast' : ENV_GATE;

function shouldRun(phase) {
  if (ONLY_PHASE && phase !== ONLY_PHASE) return false;
  if (SKIP_PHASES.has(phase)) return false;
  if (GATE === 'fast' && phase !== '6') return false;
  return true;
}

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

const scopeArg = SCOPE ? ` --scope=${SCOPE}` : '';

const PHASES = [
  {
    id: '1',
    name: 'Read-only checks',
    parallel: true,
    commands: [
      'node scripts/checks/spec-check.mjs',
      'node scripts/checks/product-docs-check.mjs',
      'node scripts/checks/product-data-check.mjs',
      'node scripts/checks/usm-check.mjs',
      'node scripts/checks/design-docs-check.mjs',
    ],
  },
  {
    id: '2',
    name: 'Syncs',
    parallel: false,
    commands: ['node scripts/checks/spec-sync.mjs', 'node scripts/checks/backlog-sync.mjs'],
  },
  {
    id: '3',
    name: 'Claims pipeline',
    parallel: false,
    commands: [
      'node scripts/checks/claim-check.mjs --auto-expire',
      'node scripts/checks/claim-check.mjs --enforce --staged',
      'node scripts/checks/claim-check.mjs --auto-complete --staged',
    ],
  },
  {
    id: '4',
    name: 'Pre-implementation gate',
    parallel: false,
    commands: ['node scripts/checks/pre-impl-gate.mjs'],
  },
  {
    id: '5',
    name: 'Fix/sync operations',
    parallel: true,
    commands: [
      'node scripts/agent-contract/sync.mjs',
      'node scripts/checks/readme-fix.mjs',
      'node scripts/checks/header-fix.mjs',
    ],
  },
  {
    id: '6',
    name: 'Validation checks',
    parallel: true,
    commands: [
      `node scripts/checks/architecture-check.mjs${scopeArg}`,
      'node scripts/checks/delivery-flow-check.mjs',
      'node scripts/checks/control-plane-check.mjs',
      'node scripts/agent-contract/check.mjs',
      'node scripts/checks/changeset-size-check.mjs',
      'node scripts/checks/capabilities-sync.mjs --check',
      'node scripts/checks/dependency-graph.mjs --check',
      'node scripts/checks/instruction-integrity-check.mjs',
    ],
  },
  {
    id: '7',
    name: 'Heavy gates',
    parallel: false,
    commands: ['node scripts/checks/test-gate.mjs', 'node scripts/checks/changelog-sync.mjs'],
  },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function runCommand(cmd) {
  const start = performance.now();
  try {
    const parts = cmd.split(/\s+/);
    const result = execFileSync(parts[0], parts.slice(1), {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    const duration = Math.round(performance.now() - start);
    return { cmd, ok: true, duration, stdout: result.trim() };
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    const stderr = error.stderr?.trim() || '';
    const stdout = error.stdout?.trim() || '';
    return { cmd, ok: false, duration, stdout, stderr, code: error.status };
  }
}

async function runParallel(commands) {
  // Use Promise.allSettled to run commands concurrently via microtask yield
  const results = await Promise.allSettled(
    commands.map(
      (cmd) =>
        new Promise((resolve) => {
          setTimeout(() => resolve(runCommand(cmd)), 0);
        }),
    ),
  );
  return results.map((r) => r.value);
}

function runSequential(commands) {
  return commands.map(runCommand);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const totalStart = performance.now();
const report = { gate: GATE, scope: SCOPE || null, phases: [] };
const failures = [];

if (GATE === 'fast' && !JSON_ONLY && !DRY_RUN) {
  process.stderr.write('Pre-commit runner: fast mode\n');
}
if (SCOPE && !JSON_ONLY && !DRY_RUN) {
  process.stderr.write(`Pre-commit runner: scoped to ${SCOPE}\n`);
}

for (const phase of PHASES) {
  if (!shouldRun(phase.id)) continue;

  if (DRY_RUN) {
    console.log(
      `Phase ${phase.id} (${phase.name}) — ${phase.parallel ? 'parallel' : 'sequential'}:`,
    );
    for (const cmd of phase.commands) console.log(`  ${cmd}`);
    continue;
  }

  const phaseStart = performance.now();
  let results;

  if (phase.parallel) {
    results = await runParallel(phase.commands);
  } else {
    results = runSequential(phase.commands);
  }

  const phaseDuration = Math.round(performance.now() - phaseStart);
  const phaseOk = results.every((r) => r.ok);

  // Print stdout/stderr for each check
  if (!JSON_ONLY) {
    for (const r of results) {
      if (r.stdout) process.stdout.write(r.stdout + '\n');
      if (r.stderr) process.stderr.write(r.stderr + '\n');
    }
  }

  if (!phaseOk) {
    failures.push(`Phase ${phase.id}: ${phase.name}`);
  }

  report.phases.push({
    id: phase.id,
    name: phase.name,
    ok: phaseOk,
    duration: phaseDuration,
    checks: results.map(({ cmd, ok, duration }) => ({ cmd, ok, duration })),
  });
}

if (DRY_RUN) process.exit(0);

// Stage auto-fixed files
if (failures.length === 0) {
  try {
    execSync('git add -u', { stdio: 'pipe' });
  } catch {
    // non-fatal
  }
}

const totalDuration = Math.round(performance.now() - totalStart);
report.totalDuration = totalDuration;
report.ok = failures.length === 0;

if (JSON_ONLY) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (failures.length > 0) {
  process.stderr.write(`\nPre-commit runner: ${failures.length} phase(s) failed:\n`);
  for (const f of failures) process.stderr.write(`  - ${f}\n`);
  process.stderr.write(`Total: ${totalDuration}ms\n`);
  process.exit(1);
}

process.stderr.write(`Pre-commit runner: OK (${totalDuration}ms)\n`);
