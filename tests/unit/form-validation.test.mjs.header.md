---
fileId: contextrail-template:tests:unit:form-validation.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the form-validation module.
owns: Unit proof of form-validation domain logic (required, minLength, maxLength, pattern, email, matches, custom, combineRules, validateField, validateForm, isFormValid).
boundaries: Must import only through modules/form-validation/public-api.mjs; must not test UI form rendering or DOM interactions; form-validation is a domain-only module with no ports or adapters to contract-test here.
invariants: All imports must go through public-api.mjs; validator functions must remain pure — no side effects, no shared mutable state; errorKey values returned by rules must use the standard dot-notation namespace (e.g. validation.required).
notesForLLM: Import exclusively via public-api.mjs. All rule functions are pure — tests should be strictly input/output with no beforeEach setup needed. combineRules and validateForm tests should cover both valid and invalid aggregated states.
tests: node:test runner via pnpm test:unit
related: tests/contract/form-validation-hex-contract.test.mjs
specRefs:
  - TPL-146
  - TPL-147
---

# form-validation.test.mjs
