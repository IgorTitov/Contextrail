---
fileId: contextrail-template:tests:contract:db-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/db/manifest.json
  - modules/db/public-api.mjs
summary: Contract tests proving the db module follows hex architecture conventions (manifest, public-api, ports, adapters, domain).
owns: Hex architecture contract compliance proof for the db module.
boundaries: Tests structural compliance only. Does not test db behavior.
invariants: Must verify manifest, public-api, ports, adapters, and domain layer presence.
securityPrivacy: No secrets.
notesForLLM: Contract test for hex compliance. Same pattern as other modules contract tests.
tests: self
related:
  - tests/unit/db.test.mjs
  - tests/bdd/db.test.mjs
---

# db-hex-contract.test.mjs
