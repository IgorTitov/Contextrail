---
fileId: contextrail-template:docs:guides:framework-integration
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn: modules/*/public-api.mjs
summary: Step-by-step guide for integrating hex modules into Next.js, Angular, Vue, and Svelte projects.
owns: The framework integration guide showing how to wrap hex adapters in React hooks, Angular services, Vue composables, and Svelte stores.
boundaries: Must not contain framework-specific source code that belongs in a framework project. Show patterns and examples only. Must not duplicate module README content.
invariants: Import paths in code examples must reference public-api.mjs barrel exports, never internal module files. Each framework section must include a project structure diagram and at least one adapter-wrapping code example.
risks: Code examples may drift from actual public-api.mjs exports if modules are renamed or restructured.
securityPrivacy: No secrets.
notesForLLM: This guide is the answer when users ask about framework compatibility. Code examples are illustrative, not runnable without a framework project. When a module's public API changes, update the corresponding example here.
linkedDocs:
  - docs/guides/README.md
  - docs/guides/platforms.md
related:
  - modules/notifications/public-api.mjs
  - modules/i18n/public-api.mjs
  - modules/onboarding/public-api.mjs
---

# framework-integration.md
