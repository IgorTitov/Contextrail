---
fileId: contextrail-template:tests:unit:test-gate-exit-semantics.test
module: tests/unit
stability: stable
steward: shared
api: file-local
summary: Regression proofs for test-gate.mjs exit-code semantics (TPL-324 / ADR-0045).
owns: 4-scenario suite covering pass/fail/stderr-noise/partial-failure exit-code contracts.
boundaries: Tests test-gate.mjs behavior via subprocess + package.json mock; no production code imports.
invariants: All four exit-code scenarios must be covered; no pnpm node_modules required in mock dirs.
risks: If test-gate.mjs no longer reads package.json for stage discovery, tests will silently become vacuous.
notesForLLM: Uses mkdtempSync for isolation; dirs are not cleaned after the run (tmpdir cleanup). Spawn test-gate.mjs with --json to get structured output. Check output.data.stages for per-stage verdicts.
tests: self
specRefs: TPL-324
related: docs/adr/0045-test-gate-integration-fix.md
---

# test-gate-exit-semantics.test.mjs
