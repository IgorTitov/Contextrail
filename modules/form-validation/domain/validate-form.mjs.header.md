---
fileId: contextrail-template:modules:form-validation:domain:validate-form
module: modules/form-validation
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: form-validation
summary: Runs all field rules across a form values object and collects per-field validation errors without short-circuiting across fields.
owns: validateForm() that applies combined rules to each field and returns {valid, errors} with failed-field details.
boundaries: Pure domain logic. No infrastructure dependencies allowed.
invariants: Must remain framework-free and testable in isolation.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
specRefs: TPL-147
linkedDocs: modules/form-validation/domain/README.md
---

# validate-form.mjs
