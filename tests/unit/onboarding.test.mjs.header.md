---
fileId: contextrail-template:tests:unit:onboarding.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/onboarding/public-api.mjs
summary: Unit tests for onboarding module — tour steps, state machine, port assertion, memory adapter, and module-local messages.
owns: The 51-test unit suite for the onboarding hex module — createTourStep, isValidStep, tour state machine, assertOnboardingPort, memory adapter, and module-local i18n messages.
boundaries: Must import only from public-api.mjs. Must not test DOM adapter (requires browser). Must not test hex structure — that belongs in the contract test.
invariants: All tests must be independent. Must use beforeEach to reset step counter and locale. Must cover domain, port, adapter, and messages layers.
risks: Step counter is module-global; forgetting resetStepCounter in beforeEach will cause ID-dependent assertions to fail across runs.
notesForLLM: Imports must come from public-api.mjs only. The DOM adapter is tested manually or via E2E, not here. When new domain functions are added to onboarding, add test cases here.
tests: self
linkedDocs: modules/onboarding/README.md
related: tests/contract/onboarding-hex-contract.test.mjs
---

# onboarding.test.mjs
