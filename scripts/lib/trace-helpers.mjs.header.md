---
fileId: contextrail-template:scripts:lib:trace-helpers
module: scripts/lib
stability: evolving
steward: shared
api: Shared trace-parsing helpers for scripts
dependsOn: scripts/lib/fs-helpers.mjs
summary: Work-item and BDD trace parsing utilities shared across repository scripts.
owns: Work-item and BDD reference parsing used by spec-check, backlog-sync, spec-sync, usm-check, and pre-impl-gate.
boundaries: This file provides trace-yaml and BDD parsing only. No header schema, CLI parsing, or output formatting.
invariants: parseBddRef always returns { file, scenario }. collectWorkItems always returns an array of structured items.
risks: Breaking these helpers affects all scripts that discover and parse work items.
securityPrivacy: Local filesystem only; no network access.
notesForLLM: Keep parsing deterministic and tolerant of missing fields. Do not couple to header schema.
tests: tests/unit/shared-helpers.test.mjs
linkedDocs: scripts/lib/README.md
related:
  - scripts/checks/_shared.mjs
  - scripts/lib/fs-helpers.mjs
---

# trace-helpers.mjs
