---
fileId: contextrail-template:scripts:lib:test-entity-map
module: scripts/lib
stability: evolving
steward: shared
api: Shared test-entity-map helpers for scripts
dependsOn:
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/header.mjs
  - scripts/lib/architecture-graph.mjs
summary: Pure functions for mapping test files to domain, architecture, and product entities.
owns: Test-to-entity mapping construction for AI Cockpit proof signals.
boundaries: Pure mapping logic only. No CLI, no console output, no file writing.
invariants: buildTestToEntityMap returns an array of canonical entity objects. buildTestRunSummary returns a canonical v0.2.0 summary.
risks: Incorrect reverse-mapping may create misleading coverage signals.
securityPrivacy: Pure computation only; no I/O.
notesForLLM: The Tests FILEINFO field is the primary link from source files to their test files. This module reverses that mapping.
tests: tests/unit/test-entity-map.test.mjs
linkedDocs: scripts/lib/README.md
specRefs: TPL-136
related:
  - scripts/lib/header.mjs
  - scripts/lib/architecture-graph.mjs
---

# test-entity-map.mjs
