---
fileId: contextrail-template:tests:contract:form-validation-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the form-validation module.
owns: Structural contract proof that modules/form-validation/ is a domain-only module with a domain/ directory, public-api.mjs entry point, manifest.json, and README.
boundaries: Must not test validation rule logic or UI form behaviour; must only assert structural constraints of the form-validation module; must not assume ports/ or adapters/ exist — this is a domain-only module.
invariants: Tests must stay red if domain/ is missing; tests must stay red if public-api.mjs or manifest.json is absent; must not import from module internals directly; the domain-only assertion must remain — do not add ports/adapters structure checks here.
notesForLLM: form-validation is intentionally domain-only — no ports or adapters directory. When the module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add validation-rule logic assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/form-validation.test.mjs
---

# form-validation-hex-contract.test.mjs
