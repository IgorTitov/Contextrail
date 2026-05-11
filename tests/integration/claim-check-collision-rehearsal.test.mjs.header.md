---
fileId: contextrail-template:tests:integration:claim-check-collision-rehearsal-test
module: tests/integration
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - node:fs
  - node:os
  - scripts/checks/claim-check.mjs
summary: End-to-end proof that claim-check.mjs --enforce blocks a realistic two-agent collision and lets a non-overlapping change through, exercised against a real temp .claims/ directory.
owns: The behavioral proof that the parallel-safety brand promise actually fires at the CLI boundary (not just inside pure functions). Closes the gap where 68 unit tests covered detectOverlaps in isolation but no test proved the full --enforce wiring blocked the right commit shape.
boundaries: Integration spec only. It must spawn the real claim-check CLI in an isolated tempdir cwd, never touch the repo's own .claims/ directory, and must clean up its temp directory in a finally block.
invariants: Both scenarios must remain — one collision case (asserts non-zero exit + CONFLICT marker + offending claim id + contested path) and one happy-path case (asserts zero exit when modules differ). Adding scenarios is fine; weakening either of these assertions is not.
risks: If the test starts mutating the repo's real .claims/ directory (e.g., via cwd misconfiguration), it would silently corrupt the example claim fixtures used by docs and other gates.
securityPrivacy: Local-only; no network, no secrets.
notesForLLM: Always spawn claim-check.mjs with cwd set to a freshly created temp directory so the CLI's CLAIMS_DIR resolves to the temp .claims/ rather than the repo root. Use process.execPath, not "node", to keep the test portable.
tests: pnpm test:integration
specRefs:
  - TPL-001
linkedDocs:
  - tests/integration/README.md
  - .claims/README.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
related:
  - scripts/checks/claim-check.mjs
  - tests/unit/claim-check.test.mjs
---

# claim-check-collision-rehearsal.test.mjs
