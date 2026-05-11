<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document the convention for hexagonal architecture metadata in structured headers and machine-readable reports.
@sidecar hex-metadata-convention.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Hex metadata convention

This document describes the convention for annotating files with hexagonal architecture metadata and generating machine-readable reports.

## Header fields

Every structured header (inline or sidecar) includes these architecture fields:

### HexLayer

Classifies the file's position in the hexagonal architecture.

Values: `domain`, `port`, `adapter`, `application`, `infrastructure`, `_none_`

Auto-inferred from path patterns:

- `/domain/` → `domain`
- `/ports/` → `port`
- `/adapters/` → `adapter`
- `/application/` → `application`
- `/infrastructure/` or `/di/` → `infrastructure`
- `modules/<name>/public-api.*` → `application`

### PortType

Direction of a port (only meaningful when HexLayer=port).

Values: `inbound`, `outbound`, `_none_`

### AdapterType

Role of an adapter (only meaningful when HexLayer=adapter).

Values: `primary`, `secondary`, `_none_`

### BoundedContext

The domain boundary the file belongs to.

Auto-inferred from `modules/<name>/` path patterns. Files outside `modules/` default to `_none_`.

### AllowedDependencies

Semicolon-delimited list of patterns this file is allowed to import. When set, relative imports not matching any pattern trigger a drift warning.

### ForbiddenDependencies

Semicolon-delimited list of patterns this file must never import. Violations trigger a drift error.

### ExternalSystems

Semicolon-delimited list of external systems this file integrates with (e.g., `PostgreSQL; Redis; Stripe API`).

---

## Report Contract v0.2.0

All report artifacts follow schema version `0.2.0`. This is the canonical definition that downstream repos must follow. Downstream repos (e.g., MedOps) may extend with additional node types (persona, scenario, story, slice, module) but must preserve the same top-level shapes.

Generated under `reports/` (gitignored):

```text
reports/
  architecture/
    declared-graph.json    # Nodes from header metadata + depends-on edges
    inferred-graph.json    # Nodes/edges from import analysis
    drift-report.json      # Declared vs inferred mismatches + violations
  test-runs/
    latest-summary.json    # Test run totals per suite
    latest-entities.json   # Entity-level test coverage mapping
```

### Generate reports

```bash
pnpm report:architecture
pnpm report:test-run
```

---

### declared-graph.json

Nodes and edges derived from structured header metadata.

```json
{
  "schemaVersion": "0.2.0",
  "generatedAt": "2026-03-28T12:00:00.000Z",
  "generatedBy": "scripts/reports/architecture-report.mjs",
  "scope": "full",
  "repoContext": "contextrail-template",
  "subsystems": [
    {
      "id": "subsystem-auth",
      "name": "Auth",
      "description": "Bounded context: auth",
      "hexLayer": "_none_"
    }
  ],
  "nodes": [
    {
      "id": "node-file-modules-auth-domain-user-mjs",
      "type": "file",
      "name": "Human-readable name or Owns field",
      "path": "modules/auth/domain/user.mjs",
      "entityRef": "contextrail-template:modules:auth:domain:user",
      "subsystem": "subsystem-auth",
      "hexLayer": "domain",
      "boundedContext": "auth",
      "portType": "_none_",
      "adapterType": "_none_",
      "declared": true,
      "metadata": {
        "layer": "module",
        "modulePackage": "modules/auth",
        "allowedDependencies": [],
        "forbiddenDependencies": ["adapters"],
        "externalSystems": [],
        "declaredDependencies": ["modules/auth/ports/greeting-port.mjs"]
      }
    }
  ],
  "edges": [
    {
      "from": "node-file-modules-auth-domain-user-mjs",
      "to": "node-file-modules-auth-ports-greeting-port-mjs",
      "type": "depends-on",
      "declared": true
    }
  ],
  "stats": {
    "totalNodes": 221,
    "totalEdges": 42,
    "nodesByType": { "file": 221 },
    "nodesBySubsystem": { "subsystem-auth": 5 },
    "nodesByHexLayer": { "domain": 3, "_none_": 218 }
  }
}
```

**Node types (extensible by downstream repos):** `file`, `persona`, `scenario`, `story`, `slice`, `module`, `script`, `test`

**Edge types:** `imports`, `depends-on`, `owns-scenario`, `targets-module`, `persona-scenario`, `tests`, `references`

The template produces only `file` nodes and `depends-on`/`imports` edges. Downstream repos extend with product-entity types.

---

### inferred-graph.json

Same top-level shape as declared-graph. Nodes have `"declared": false` and `"inferredFrom": "import-target"`. Edges have `"declared": false` and `"evidence": "..."`.

Only relative imports appear as edges. External imports (node:*, npm packages) are excluded from the architecture graph.

```json
{
  "schemaVersion": "0.2.0",
  "generatedAt": "2026-03-28T12:00:00.000Z",
  "generatedBy": "scripts/reports/architecture-report.mjs",
  "scope": "full",
  "repoContext": "contextrail-template",
  "subsystems": [],
  "nodes": [
    {
      "id": "node-file-phantom-mjs",
      "type": "file",
      "name": "phantom.mjs",
      "path": "phantom.mjs",
      "entityRef": "node-file-phantom-mjs",
      "subsystem": null,
      "hexLayer": "_none_",
      "boundedContext": "_none_",
      "portType": "_none_",
      "adapterType": "_none_",
      "declared": false,
      "inferredFrom": "import-target",
      "metadata": {}
    }
  ],
  "edges": [
    {
      "from": "node-file-app-mjs",
      "to": "node-file-lib-foo-mjs",
      "type": "imports",
      "declared": false,
      "evidence": "import in app.mjs"
    }
  ],
  "stats": {
    "totalNodes": 0,
    "totalEdges": 180,
    "nodesByType": {},
    "nodesBySubsystem": {},
    "nodesByHexLayer": {}
  }
}
```

---

### drift-report.json

```json
{
  "schemaVersion": "0.2.0",
  "generatedAt": "2026-03-28T12:00:00.000Z",
  "generatedBy": "scripts/reports/architecture-report.mjs",
  "scope": "full",
  "declaredNodeCount": 221,
  "inferredNodeCount": 0,
  "declaredEdgeCount": 42,
  "inferredEdgeCount": 180,
  "violations": [
    {
      "type": "forbidden-dependency",
      "node": "node-file-domain-user-mjs",
      "file": "domain/user.mjs",
      "message": "imports \"../adapters/db.mjs\" which matches forbidden pattern \"adapters\"",
      "severity": "error"
    }
  ],
  "orphanNodes": ["node-file-standalone-mjs"],
  "declaredOnlyEdges": [
    { "from": "node-file-a-mjs", "to": "node-file-b-mjs", "type": "depends-on" }
  ],
  "inferredOnlyEdges": [
    { "from": "node-file-a-mjs", "to": "node-file-c-mjs", "type": "imports" }
  ],
  "status": "drift-detected"
}
```

**Violation types:** `forbidden-dependency` (error), `undeclared-dependency` (warning), `missing-declaration` (warning)

**Status:** `"clean"` when no violations; `"drift-detected"` otherwise.

---

### latest-summary.json

```json
{
  "schemaVersion": "0.2.0",
  "runId": "run-2026-03-28T12:00:00.000Z",
  "timestamp": "2026-03-28T12:00:00.000Z",
  "runner": "node --test (TAP)",
  "suites": [
    {
      "id": "all",
      "name": "All tests",
      "command": "pnpm test:all",
      "totalTests": 315,
      "passed": 315,
      "failed": 0,
      "status": "pass"
    }
  ],
  "overallStatus": "pass",
  "totalTests": 315,
  "totalPassed": 315,
  "totalFailed": 0
}
```

**Suite IDs (extensible):** `unit`, `integration`, `contract`, `bdd`, `e2e`, `all`

---

### latest-entities.json

```json
{
  "schemaVersion": "0.2.0",
  "runId": "run-2026-03-28T12:00:00.000Z",
  "timestamp": "2026-03-28T12:00:00.000Z",
  "totalEntities": 221,
  "coveredEntities": 101,
  "untestedEntities": 120,
  "entities": [
    {
      "entityRef": "contextrail-template:modules:auth:domain:user",
      "entityType": "file",
      "path": "modules/auth/domain/user.mjs",
      "architectureNodeRef": "node-file-modules-auth-domain-user-mjs",
      "testStatus": "covered",
      "coveragePercent": null,
      "suiteIds": ["unit"],
      "testIds": ["tests/unit/user.test.mjs"],
      "lastRunId": null,
      "timestamp": null
    }
  ]
}
```

**Entity types (extensible by downstream repos):** `file`, `persona`, `scenario`, `story`, `slice`, `module`, `script`, `test`

**Test status:** `"covered"` when the file's `Tests` FILEINFO field points to test files; `"untested"` otherwise.

---

## Test-to-entity mapping

The mapping is built by reading the `Tests` FILEINFO field from each source file's header. Files whose `Tests` field points to test files are marked `"covered"`. Suite IDs are inferred from test file paths (`tests/unit/*` → `"unit"`, `tests/integration/*` → `"integration"`, etc.).

## Downstream extension

Downstream repos extend the contract by:

1. Adding product-entity node types (persona, scenario, story, slice, module) to the declared graph
2. Adding product-relationship edge types (owns-scenario, targets-module, persona-scenario) to edges
3. Adding domain-specific entity types to the entities report
4. Preserving all top-level keys and shapes defined here
