---
fileId: contextrail-template:modules:form-validation:public-api
module: modules/form-validation
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: form-validation
dependsOn:
  - modules/form-validation/ports/validation-port.mjs
  - modules/form-validation/domain/rules.mjs
  - modules/form-validation/domain/validate-form.mjs
summary: Public API facade for the form-validation module — re-exports port assertion, validation rules, and form-level validation.
owns: The single cross-module entry point for the form-validation bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/form-validation.test.mjs
  - tests/contract/form-validation-hex-contract.test.mjs
  - tests/bdd/form-validation.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/form-validation/README.md
  - docs/_generated/dependency-graph.json
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - combineRules
  - custom
  - email
  - getLocale
  - isFormValid
  - matches
  - maxLength
  - minLength
  - pattern
  - registerLocale
  - required
  - resetLocale
  - setLocale
  - t
  - validateField
  - validateForm
---

# public-api.mjs

