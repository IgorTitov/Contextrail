<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the decision to extend structured headers with architecture metadata and add machine-readable report artifacts for AI Cockpit integration.
@sidecar 0003-architecture-metadata-for-ai-cockpit.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0003 — Architecture metadata for AI Cockpit

## Status

Accepted

## Context

Descendant repositories need to expose structured architecture and test-proof metadata so that external tools (AI Cockpit, visualization dashboards, CI quality gates) can read and reason about the codebase without parsing source code directly.

The existing structured header system already carries per-file metadata (Layer, Module/Package, DependsOn, etc.) but lacks explicit hexagonal architecture semantics and bounded-context linkage.

## Decision

### 1. Extend the structured header schema

Add 7 new FILEINFO fields to the canonical schema:

| Field | Values | Purpose |
|---|---|---|
| `HexLayer` | `domain`, `port`, `adapter`, `application`, `infrastructure`, `_none_` | Hexagonal layer classification |
| `PortType` | `inbound`, `outbound`, `_none_` | Port direction (only when HexLayer=port) |
| `AdapterType` | `primary`, `secondary`, `_none_` | Adapter role (only when HexLayer=adapter) |
| `BoundedContext` | Module name or `_none_` | Domain boundary the file belongs to |
| `AllowedDependencies` | Semicolon-delimited paths or `_none_` | Explicit allow-list for dependency checking |
| `ForbiddenDependencies` | Semicolon-delimited paths or `_none_` | Explicit deny-list for drift detection |
| `ExternalSystems` | Semicolon-delimited names or `_none_` | External integrations this file touches |

Fields use `_none_` as the default and are inferred where possible (`HexLayer` from path patterns, `BoundedContext` from `modules/<name>/`).

### 2. Add machine-readable report artifacts

Generate gitignored JSON artifacts under `reports/`:

- `reports/architecture/declared-graph.json` — nodes from header metadata
- `reports/architecture/inferred-graph.json` — edges from import analysis
- `reports/architecture/drift-report.json` — declared vs inferred mismatches
- `reports/test-runs/latest-summary.json` — test run summary
- `reports/test-runs/latest-entities.json` — test-to-entity mapping

### 3. Test-to-entity mapping convention

Reverse-map the existing `Tests` FILEINFO field combined with `BoundedContext` and `HexLayer` to link test files to domain/architecture entities.

## Consequences

- All existing headers gain 7 new fields via `header-fix` (defaulting to `_none_`).
- External tools can read `reports/` JSON without parsing source files.
- Drift detection becomes possible by comparing declared headers against actual imports.
- The schema stays bounded — no product-specific semantics, no full ontology.

## References

- `scripts/lib/header.mjs` — canonical header engine
- `scripts/lib/architecture-graph.mjs` — graph builder
- `scripts/lib/test-entity-map.mjs` — test mapping
- `scripts/reports/architecture-report.mjs` — report CLI
- `scripts/reports/test-run-report.mjs` — report CLI
