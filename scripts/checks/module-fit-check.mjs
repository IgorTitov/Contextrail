/* @HEADER
 * @version 0.7.101 | 2026-05-05
 * @purpose Measure each module's "work surface" token cost and report whether it fits the local-LLM 16K context floor.
 * @sidecar module-fit-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-210
//
// For each modules/<name>/, sums approximate tokens of:
//   manifest.json + public-api.{mjs,d.ts} + .header.md sidecars of those files
//   + one representative implementation file (largest in domain/, then adapters/)
//   + one representative test file (tests/unit/<name>*, tests/contract/<name>*)
//
// Token approximation: Math.ceil(bytes / 4) — same convention used in
// docs/SYSTEM_MAP.md and the v0.7.17 multi-tier analysis. NOT a real
// tokenizer; sufficient for relative-budget comparison.
//
// Usage:
//   node scripts/checks/module-fit-check.mjs                # human table, exit 0
//   node scripts/checks/module-fit-check.mjs --json         # machine-readable
//   node scripts/checks/module-fit-check.mjs --warn-only    # warnings only, never exits non-zero
//   node scripts/checks/module-fit-check.mjs --report       # also write docs/_generated/module-fit-report.json
//   node scripts/checks/module-fit-check.mjs --warn=8000 --error=12000

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approximateTokenCount,
  pickRepresentativeImpl,
  pickRepresentativeTest,
  measureWorkSurface,
  computeDistribution,
  discoverModuleNames,
} from '../lib/module-work-surface.mjs';

// Re-export work-surface API so existing consumers (tests, other tools) need no import-path change.
export {
  approximateTokenCount,
  pickRepresentativeImpl,
  pickRepresentativeTest,
  measureWorkSurface,
  computeDistribution,
  discoverModuleNames,
};

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// Default thresholds — see docs/adr/0013-module-work-surface-budget.md.
// Warn at the data-driven ceiling for "well-shaped" modules; error reserved
// for a follow-up TPL after oversized modules are addressed.
export const DEFAULT_WARN_TOKENS = 8000;
export const DEFAULT_ERROR_TOKENS = 12000;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const map = new Map();
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        map.set(arg.slice(0, eq), arg.slice(eq + 1));
      } else {
        map.set(arg, true);
      }
    }
  }
  return map;
}

function fmt(n) {
  return String(n).padStart(6, ' ');
}

function renderTable(records, warnTokens, errorTokens) {
  const lines = [];
  lines.push(`module-fit-check: measured ${records.length} module(s)`);
  lines.push(`  warn at ${warnTokens} tokens, error at ${errorTokens} tokens (16K-context budget)`);
  lines.push('');
  lines.push('  total | manifest |  public |   side |    impl |    test | module');
  lines.push('  ---------+----------+---------+--------+---------+---------+--------');
  const sorted = [...records].sort((a, b) => b.totalTokens - a.totalTokens);
  for (const r of sorted) {
    const flag = r.totalTokens >= errorTokens ? ' ERR' : r.totalTokens >= warnTokens ? ' WARN' : '';
    lines.push(
      `  ${fmt(r.totalTokens)} | ${fmt(r.parts.manifest)} | ${fmt(r.parts.publicApi)} | ${fmt(r.parts.sidecars)} | ${fmt(r.parts.impl)} | ${fmt(r.parts.test)} | ${r.module}${flag}`,
    );
  }
  return lines.join('\n');
}

function renderSummary(distribution, warnTokens, errorTokens, overWarn, overError) {
  const lines = [];
  lines.push('');
  lines.push('Distribution (tokens per module work surface):');
  lines.push(
    `  count=${distribution.count}  min=${distribution.min}  p50=${distribution.p50}  p75=${distribution.p75}  p95=${distribution.p95}  max=${distribution.max}  mean=${distribution.mean}`,
  );
  lines.push(`  >= warn (${warnTokens}): ${overWarn.length}`);
  lines.push(`  >= error (${errorTokens}): ${overError.length}`);
  return lines.join('\n');
}

function ensureDir(absDir) {
  try {
    mkdirSync(absDir, { recursive: true });
  } catch {
    // ignore
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const wantJson = args.has('--json');
  const wantReport = args.has('--report');
  const warnOnly = args.has('--warn-only');
  const warnTokens = Number(args.get('--warn')) || DEFAULT_WARN_TOKENS;
  const errorTokens = Number(args.get('--error')) || DEFAULT_ERROR_TOKENS;

  const moduleNames = discoverModuleNames();
  const records = moduleNames.map((name) => measureWorkSurface(name));

  const totals = records.map((r) => r.totalTokens);
  const distribution = computeDistribution(totals);
  const overWarn = records
    .filter((r) => r.totalTokens >= warnTokens)
    .map((r) => ({ module: r.module, totalTokens: r.totalTokens }));
  const overError = records
    .filter((r) => r.totalTokens >= errorTokens)
    .map((r) => ({ module: r.module, totalTokens: r.totalTokens }));

  const output = {
    ok: warnOnly ? true : overError.length === 0,
    thresholds: { warn: warnTokens, error: errorTokens },
    distribution,
    modules: records,
    overWarn,
    overError,
    generatedAt: new Date().toISOString(),
  };

  if (wantReport) {
    const reportDir = join(ROOT, 'docs', '_generated');
    ensureDir(reportDir);
    const reportPath = join(reportDir, 'module-fit-report.json');
    writeFileSync(reportPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
    if (!wantJson) {
      console.log(
        `module-fit-check: report written to ${reportPath.slice(ROOT.length + 1).replaceAll('\\', '/')}`,
      );
    }
  }

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(renderTable(records, warnTokens, errorTokens));
    console.log(renderSummary(distribution, warnTokens, errorTokens, overWarn, overError));
    if (overWarn.length > 0) {
      console.log('');
      console.log(`Warnings (${overWarn.length} module(s) over warn threshold):`);
      for (const m of overWarn) {
        console.log(
          `  WARN module-fit: ${m.module} = ${m.totalTokens} tokens (warn=${warnTokens})`,
        );
      }
    }
    if (overError.length > 0 && !warnOnly) {
      console.log('');
      console.log(`Errors (${overError.length} module(s) over error threshold):`);
      for (const m of overError) {
        console.log(
          `  ERR module-fit: ${m.module} = ${m.totalTokens} tokens (error=${errorTokens})`,
        );
      }
    }
  }

  if (warnOnly) {
    process.exit(0);
  }
  process.exit(overError.length === 0 ? 0 : 1);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('module-fit-check.mjs') ||
    process.argv[1].endsWith('module-fit-check'));

if (isDirectRun) {
  main().catch((err) => {
    console.error(`module-fit-check: fatal error: ${err.message}`);
    process.exit(1);
  });
}
