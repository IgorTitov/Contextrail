---
fileId: contextrail-template:modules:onboarding:public-api
module: modules/onboarding
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: onboarding
dependsOn:
  - modules/onboarding/ports/onboarding-port.mjs
  - modules/onboarding/domain/wizard-state.mjs
  - modules/onboarding/adapters/local-storage-adapter.mjs
summary: Public API facade for the onboarding module — re-exports port assertion, wizard state, and adapter factories.
owns: The single cross-module entry point for the onboarding bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/onboarding.test.mjs
  - tests/contract/onboarding-hex-contract.test.mjs
  - tests/bdd/onboarding.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/onboarding/README.md
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
  - assertOnboardingPort
  - canAdvance
  - canGoBack
  - completeItem
  - createChecklistState
  - createDomOnboardingAdapter
  - createMemoryOnboardingAdapter
  - createTourState
  - createTourStep
  - deserializeProgress
  - dismissChecklist
  - endTour
  - getCompletionPercent
  - getCurrentStep
  - getGroupedItems
  - getLocale
  - getNextItem
  - isAllComplete
  - isFirstStep
  - isItemAvailable
  - isLastStep
  - isValidStep
  - nextStep
  - previousStep
  - registerLocale
  - resetLocale
  - resetStepCounter
  - serializeProgress
  - setLocale
  - startTour
  - t
  - uncompleteItem
---

# public-api.mjs

