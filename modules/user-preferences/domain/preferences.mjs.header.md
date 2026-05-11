---
fileId: contextrail-template:modules:user-preferences:domain:preferences
module: modules/user-preferences
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: user-preferences
summary: Default preferences factory and validated merge for locale and theme (light/dark/system) settings.
owns: defaultPreferences() factory and mergePreferences() with value validation for locale and theme fields.
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
linkedDocs: modules/user-preferences/domain/README.md
---

# preferences.mjs
