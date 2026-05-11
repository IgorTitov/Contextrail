---
fileId: contextrail-template:apps:starter:examples:contract-seam:notifications-contract
module: apps/starter/examples/contract-seam
stability: evolving
steward: shared
api: "{ notify, _setImpl, _resetImpl }"
owns: Optional example of a contract-first browser module seam.
boundaries: This file is a teaching example only. It must not become production infrastructure.
invariants: Facade functions throw if no implementation is wired. _setImpl() replaces the active implementation.
risks: If this example grows beyond one bounded concern it stops being a useful pattern reference.
securityPrivacy: Example code only; no secrets or network access.
notesForLLM: This is an optional advanced pattern. Do not apply it to every module — only where implementation churn justifies the indirection.
tests: tests/unit/contract-seam-example.test.mjs
linkedDocs: apps/starter/examples/contract-seam/README.md
related: apps/starter/README.md
summary: Notifications_contract for the starter app.
---

# notifications_contract.mjs
