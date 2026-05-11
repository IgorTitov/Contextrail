---
fileId: contextrail-template:tests:contract:job-queue-hex-contract
module: tests/contract
stability: evolving
steward: shared
api: "Test"
boundedContext: job-queue
summary: Prove that the job-queue bounded module follows the hex architecture contract.
owns: Contract tests for folder structure, public-api surface, and forbidden deep imports.
boundaries: Verifies structure, not behavior. Behavior proofs live in tests/unit/.
invariants: Fails if the hex folder layout drifts or if consumers deep-import internals.
notesForLLM: Update this test when the module structure changes intentionally.
specRefs:
  - TPL-001
---

# job-queue-hex-contract.test.mjs
