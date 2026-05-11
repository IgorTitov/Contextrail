---
fileId: contextrail-template:tests:unit:README
module: tests/unit
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - tests/unit/traceability-id.mjs
  - tests/unit/traceability-id.test.mjs
summary: Explain the tiny pure-logic examples that anchor the template’s unit-test layer.
owns: The unit-test layer entrypoint for the standalone Claude template.
boundaries: This folder is for pure logic only. Do not turn it into an integration or filesystem-heavy test area.
invariants: Unit tests stay fast, deterministic, and self-contained.
risks: If this folder drifts into integration behavior, the template loses a clean example of a true unit test.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Put pure helpers and direct assertions here. Keep dependencies minimal.
tests: pnpm test:unit
linkedDocs: tests/README.md
related: tests/unit/traceability-id.test.mjs
---

# README.md
