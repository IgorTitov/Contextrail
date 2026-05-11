---
fileId: contextrail-template:modules:i18n:domain:pluralization
module: modules/i18n
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: i18n
summary: Creates a locale-aware plural resolver backed by Intl.PluralRules that selects the correct form (zero/one/two/few/many/other) for a given count.
owns: createPluralResolver factory, PLURAL_CATEGORIES constant, and fallback one/other logic when Intl is unavailable.
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
linkedDocs: modules/i18n/domain/README.md
---

# pluralization.mjs
