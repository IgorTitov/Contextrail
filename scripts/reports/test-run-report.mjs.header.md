---
fileId: contextrail-template:scripts:reports:test-run-report
module: scripts/reports
stability: evolving
steward: shared
api: "CLI: node scripts/reports/test-run-report.mjs [--json] [--tap-file=<path>] [--skip-run]"
dependsOn:
  - scripts/lib/test-entity-map.mjs
  - scripts/lib/header.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/output.mjs
  - scripts/lib/cli-helpers.mjs
  - scripts/lib/architecture-graph.mjs
summary: CLI script that generates machine-readable test-run report artifacts for AI Cockpit.
owns: Generation of test-run report artifacts in reports/test-runs/.
boundaries: This file is a CLI entry point only. Mapping logic lives in scripts/lib/test-entity-map.mjs.
invariants: Outputs are always valid JSON.
risks: Stale reports if not regenerated after test runs.
securityPrivacy: Reads local files only; writes to reports/test-runs/.
notesForLLM: This is a CLI wrapper. Keep mapping logic in the lib module.
tests: tests/contract/architecture-report-contract.test.mjs
linkedDocs: scripts/reports/README.md
specRefs: TPL-136
related:
  - scripts/lib/test-entity-map.mjs
  - scripts/reports/architecture-report.mjs
---

# test-run-report.mjs
