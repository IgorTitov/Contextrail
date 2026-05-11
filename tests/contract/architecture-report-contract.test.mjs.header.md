---
fileId: contextrail-template:tests:contract:architecture-report-contract.test
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - node:fs
  - node:path
summary: Contract proof that architecture and test-run report scripts produce well-formed JSON artifacts matching the documented v0.2.0 shapes.
owns: Contract proof for architecture and test-run report artifact shapes.
boundaries: This file is a contract spec only. Tests run the CLI scripts and assert output shapes.
invariants: Artifacts must be valid JSON with the documented top-level keys matching schema v0.2.0.
risks: Shape changes in report scripts without updating this contract will fail the test gate.
securityPrivacy: Local test code only.
notesForLLM: These are shape-contract tests. They verify top-level keys and array types, not specific values.
tests: self
linkedDocs:
  - docs/architecture/hex-metadata-convention.md
  - scripts/reports/README.md
related:
  - scripts/reports/architecture-report.mjs
  - scripts/reports/test-run-report.mjs
---

# architecture-report-contract.test.mjs
