<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Folder overview for the report generation scripts.
@sidecar README.md.header.md
@layer tooling | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# Report generation scripts

These scripts generate machine-readable JSON artifacts under `reports/` for external tooling (AI Cockpit, CI dashboards, etc.).

| Script | Output | Purpose |
|---|---|---|
| `architecture-report.mjs` | `reports/architecture/*.json` | Declared graph, inferred graph, drift detection |
| `test-run-report.mjs` | `reports/test-runs/*.json` | Test-to-entity mapping and run summaries |

## Usage

```bash
pnpm report:architecture
pnpm report:test-run
```

The `reports/` directory is gitignored — artifacts are generated on demand, not committed.

## Library modules

Pure logic lives in `scripts/lib/`:

- `architecture-graph.mjs` — `buildDeclaredGraph()`, `buildInferredGraph()`, `computeDrift()`
- `test-entity-map.mjs` — `buildTestToEntityMap()`, `buildTestRunSummary()`
