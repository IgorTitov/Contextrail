---
fileId: contextrail-template:modules:i18n:public-api
module: modules/i18n
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: i18n
dependsOn:
  - modules/i18n/ports/i18n-port.mjs
  - modules/i18n/domain/locale-manager.mjs
  - modules/i18n/adapters/intl-adapter.mjs
  - modules/i18n/adapters/static-adapter.mjs
summary: Public API facade for the i18n module — re-exports locale management, formatting, and adapter factories.
owns: The single cross-module entry point for the i18n bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/i18n.test.mjs
  - tests/contract/i18n-hex-contract.test.mjs
  - tests/bdd/i18n.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/i18n/README.md
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
  - assertI18nPort
  - buildFallbackChain
  - createIntlAdapter
  - createMemoryI18nAdapter
  - createMessageRegistry
  - createPluralResolver
  - getLocale
  - interpolate
  - PLURAL_CATEGORIES
  - registerLocale
  - resetLocale
  - resolveWithFallback
  - setLocale
  - t
---

# public-api.mjs

