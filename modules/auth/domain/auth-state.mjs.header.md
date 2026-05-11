---
fileId: contextrail-template:modules:auth:domain:auth-state
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: auth
dependsOn: modules/auth/ports/auth-port.mjs
owns: In-memory current-user store; listener subscription and notification logic for auth change events.
boundaries: Must not perform persistence, network calls, or direct framework coupling. Must not be imported outside the auth module.
invariants: Listener list must be cleaned up on destroy; state must never hold stale user references after logout; all notifications must fire synchronously on state change.
risks: Listener leaks if destroy is not called; shared mutable state could cause cross-adapter interference if instantiated incorrectly.
notesForLLM: Internal-only; adapters import this to share state. Do not expose outside the auth module boundary. Each adapter should create its own state instance.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-063
related:
  - modules/auth/adapters/anonymous-adapter.mjs
  - modules/auth/adapters/local-password-adapter.mjs
  - modules/auth/adapters/oauth-stub-adapter.mjs
summary: Shared in-memory auth state holder that tracks the current user and notifies registered listeners on login/logout changes.
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
---

# auth-state.mjs
