---
fileId: contextrail-template:tests:contract:email-hex
module: tests/contract
stability: evolving
steward: shared
api: Tests
boundedContext: email
summary: Contract proof for the email bounded module's hex architecture shape.
owns: Structural assertions for folders, public-api surface, README, and deep-import forbidance.
boundaries: Structural checks only. No behavioral assertions (those live in the unit test).
invariants: Fails immediately when the email module deviates from the hex layering rules.
notesForLLM: Update alongside public-api.mjs additions so the expected-export list stays current.
specRefs:
  - TPL-001
---

# email-hex-contract.test.mjs
