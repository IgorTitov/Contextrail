/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose CLI script that generates machine-readable architecture report artifacts for AI Cockpit.
 * @sidecar architecture-report.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli-helpers.mjs';
import { result } from '../lib/output.mjs';
import { ROOT, toPosix } from '../lib/fs-helpers.mjs';
import { collectRepoFiles, isSidecarHeader, HEADER_EXEMPT_FILES } from '../lib/header.mjs';
import {
  buildDeclaredGraph,
  buildInferredGraph,
  computeDrift,
} from '../lib/architecture-graph.mjs';

const args = parseArgs();
const wantJson = args.has('--json');

const REPORT_DIR = path.join(ROOT, 'reports', 'architecture');

// Read repo name from package.json
let repoContext = 'unknown';
try {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  repoContext = pkg.name || 'unknown';
} catch {
  // fall through
}

const graphOptions = {
  repoContext,
  generatedBy: 'scripts/reports/architecture-report.mjs',
};

async function main() {
  mkdirSync(REPORT_DIR, { recursive: true });

  // Collect all repo files and read their contents
  const files = await collectRepoFiles();
  const fileSources = [];

  for (const file of files) {
    if (isSidecarHeader(file)) continue;
    if (HEADER_EXEMPT_FILES.has(file)) continue;

    const fullPath = path.join(ROOT, file);
    let text;
    try {
      text = readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }
    fileSources.push({ file: toPosix(file), text });
  }

  // Build graphs and drift report
  const declared = buildDeclaredGraph(fileSources, graphOptions);
  const inferred = buildInferredGraph(fileSources, graphOptions);
  const drift = computeDrift(declared, inferred, fileSources);

  // Write artifacts
  const declaredPath = path.join(REPORT_DIR, 'declared-graph.json');
  const inferredPath = path.join(REPORT_DIR, 'inferred-graph.json');
  const driftPath = path.join(REPORT_DIR, 'drift-report.json');

  writeFileSync(declaredPath, JSON.stringify(declared, null, 2) + '\n');
  writeFileSync(inferredPath, JSON.stringify(inferred, null, 2) + '\n');
  writeFileSync(driftPath, JSON.stringify(drift, null, 2) + '\n');

  const output = result('architecture-report', true, [], [], {
    declaredNodeCount: declared.stats.totalNodes,
    declaredEdgeCount: declared.stats.totalEdges,
    inferredEdgeCount: inferred.stats.totalEdges,
    driftViolations: drift.violations.length,
    status: drift.status,
    artifacts: [
      toPosix(path.relative(ROOT, declaredPath)),
      toPosix(path.relative(ROOT, inferredPath)),
      toPosix(path.relative(ROOT, driftPath)),
    ],
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`architecture-report: OK`);
    console.log(`  declared nodes: ${declared.stats.totalNodes}`);
    console.log(`  declared edges: ${declared.stats.totalEdges}`);
    console.log(`  inferred edges: ${inferred.stats.totalEdges}`);
    console.log(`  drift status:   ${drift.status}`);
    console.log(`  violations:     ${drift.violations.length}`);
    console.log(`  artifacts written to reports/architecture/`);
  }
}

main().catch((error) => {
  const output = result('architecture-report', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
