---
fileId: contextrail-template:modules:form-validation:domain:rules
module: modules/form-validation
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: form-validation
summary: Composable validation rule factories (required, minLength, maxLength, pattern, email, matches, custom) and a combineRules short-circuit combinator.
owns: Individual rule factories returning ValidationRule functions and combineRules() that chains them with first-failure short-circuit.
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
specRefs: TPL-146
linkedDocs: modules/form-validation/domain/README.md
---

# rules.mjs
