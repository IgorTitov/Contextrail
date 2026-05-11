---
fileId: contextrail-template:tests:integration:README
module: tests/integration
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - tests/integration/repo-workflow.test.mjs
  - tests/integration/dangerous-command-hook.test.mjs
  - tests/integration/control-plane-coherence.test.mjs
  - tests/integration/design-flow-coherence.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
summary: Explain the integration-test folder as the home for multi-file wiring checks and small local end-to-end entrypoint proofs.
owns: The folder-level guide to integration tests that compare repository surfaces or execute wired local entrypoints end to end.
boundaries: This folder is for multi-file wiring checks and small local integration behavior. Do not treat it as a unit-test or e2e area.
invariants: Integration tests stay deterministic, local-only, and focused on agreement between repo surfaces or the behavior of wired local entrypoints.
risks: If this folder drifts into placeholders, the template loses executable proof that its workflow surfaces agree.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer assertions that compare two or more real repo surfaces or exercise a real local entrypoint end to end.
tests: pnpm test:integration
linkedDocs:
  - tests/README.md
  - scripts/README.md
  - .claude/hooks/README.md
related:
  - tests/integration/repo-workflow.test.mjs
  - tests/integration/dangerous-command-hook.test.mjs
  - tests/integration/control-plane-coherence.test.mjs
  - tests/integration/design-flow-coherence.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
---

# README.md
