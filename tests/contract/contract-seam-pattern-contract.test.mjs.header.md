---
fileId: contextrail-template:tests:contract:contract-seam-pattern-contract
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - apps/starter/examples/contract-seam/notifications_contract.mjs
summary: Prove that the optional contract-first seam example exists, is importable, and exports the expected pattern surface.
owns: Contract proof that the optional contract-seam pattern example exists and follows the expected shape.
boundaries: This file is a deterministic contract spec only.
invariants: Must fail if the example disappears or loses its pattern exports.
risks: Without this contract, the pattern example could silently break or be removed.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep assertions high-signal. This proves the pattern surface, not implementation details.
tests: pnpm test:contract
linkedDocs: apps/starter/examples/contract-seam/README.md
related: apps/starter/examples/contract-seam/notifications_contract.mjs
---

# contract-seam-pattern-contract.test.mjs
