---
fileId: contextrail-template:scripts:reports:architecture-report
module: scripts/reports
stability: evolving
steward: shared
api: "CLI: node scripts/reports/architecture-report.mjs [--json]"
dependsOn:
  - scripts/lib/architecture-graph.mjs
  - scripts/lib/header.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/output.mjs
  - scripts/lib/cli-helpers.mjs
summary: CLI script that generates machine-readable architecture report artifacts for AI Cockpit.
owns: Generation of architecture report artifacts in reports/architecture/.
boundaries: This file is a CLI entry point only. Graph logic lives in scripts/lib/architecture-graph.mjs.
invariants: Outputs are always valid JSON. Reports directory is created if missing.
risks: Stale reports if not regenerated after code changes.
securityPrivacy: Reads local files only; writes to reports/architecture/.
notesForLLM: This is a CLI wrapper. Keep graph logic in the lib module.
tests: tests/contract/architecture-report-contract.test.mjs
linkedDocs: scripts/reports/README.md
related:
  - scripts/lib/architecture-graph.mjs
  - scripts/checks/architecture-check.mjs
---

# architecture-report.mjs
