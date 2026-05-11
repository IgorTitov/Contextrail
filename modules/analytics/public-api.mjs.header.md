---
fileId: contextrail-template:modules:analytics:public-api
module: modules/analytics
stability: evolving
steward: shared
api: Cross-module public API
boundedContext: analytics
dependsOn:
  - modules/analytics/ports/analytics-port.mjs
  - modules/analytics/domain/session-manager.mjs
  - modules/analytics/domain/consent.mjs
  - modules/analytics/domain/mouse-collector.mjs
  - modules/analytics/adapters/console-adapter.mjs
  - modules/analytics/adapters/no-op-adapter.mjs
  - modules/analytics/adapters/behavioral-adapter.mjs
summary: Public API facade for the analytics module — re-exports port assertion, domain utilities, and adapter factories.
owns: The single cross-module entry point for the analytics bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Privacy-first analytics; all tracking is consent-gated.
notesForLLM: Cross-module consumers import from this file only. The module respects Do Not Track and requires explicit consent before tracking.
tests:
  - tests/unit/analytics.test.mjs
  - tests/contract/analytics-hex-contract.test.mjs
  - tests/bdd/analytics.test.mjs
linkedDocs:
  - modules/analytics/README.md
  - docs/_generated/dependency-graph.json
specRefs:
  - TPL-001
related: apps/starter/app.mjs
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
  - assertAnalyticsPort
  - createAnalyticsConsoleAdapter
  - createAnalyticsNoOpAdapter
  - createBehavioralAdapter
  - createDefaultConsent
  - createMouseCollector
  - createSessionManager
  - getLocale
  - isConsentGranted
  - registerLocale
  - resetLocale
  - respectsDoNotTrack
  - setLocale
  - t
---

# public-api.mjs

