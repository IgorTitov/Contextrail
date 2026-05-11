---
fileId: contextrail-template:tests:contract:onboarding-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/onboarding/manifest.json
  - modules/onboarding/public-api.mjs
summary: Verify onboarding module conforms to hex architecture contract (folder structure, barrel export, manifest, README, no deep imports).
owns: The hex contract compliance suite for the onboarding module — folder structure, manifest validity, barrel export, README, and no-deep-import assertions.
boundaries: Must only test structural compliance. Must not test domain logic or adapter behavior — those belong in unit tests.
invariants: Must check for public-api.mjs, manifest.json, README.md, expected hex folders, and that unit tests import only from public-api.mjs.
risks: If new hex contract requirements are added globally, this file must be updated to match.
notesForLLM: Follow the same pattern as other hex contract tests (e.g. notifications-hex-contract.test.mjs). When adding a new structural check, add it to all contract test files.
tests: self
linkedDocs: modules/onboarding/README.md
related: tests/contract/notifications-hex-contract.test.mjs
---

# onboarding-hex-contract.test.mjs
