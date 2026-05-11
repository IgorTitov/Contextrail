---
fileId: contextrail-template:modules:i18n:domain:message-registry
module: modules/i18n
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: i18n
summary: In-memory registry that collects namespaced message bundles per locale and resolves translation keys across all registered modules.
owns: createMessageRegistry factory with register, resolve, getAvailableLocales, getKeysForLocale, and clear operations.
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

# message-registry.mjs
