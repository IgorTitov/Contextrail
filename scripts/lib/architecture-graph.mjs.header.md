---
fileId: contextrail-template:scripts:lib:architecture-graph
module: scripts/lib
stability: evolving
steward: shared
api: Shared architecture-graph helpers for scripts
dependsOn:
  - node:path
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/header.mjs
summary: Pure functions for building declared and inferred architecture graphs and computing drift between them.
owns: Declared/inferred architecture graph construction and drift computation.
boundaries: Pure graph logic only. No CLI, no console output, no file writing.
invariants: buildDeclaredGraph and buildInferredGraph return canonical v0.2.0 graph shapes. computeDrift returns a canonical drift report.
risks: Incorrect parsing of headers or imports leads to misleading drift reports.
securityPrivacy: Reads local files only; no network access.
notesForLLM: Keep functions pure where possible. Import extraction reuses patterns from architecture-check.mjs.
tests: tests/unit/architecture-graph.test.mjs
linkedDocs: scripts/lib/README.md
related:
  - scripts/lib/header.mjs
  - scripts/checks/architecture-check.mjs
---

# architecture-graph.mjs
