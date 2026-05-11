---
fileId: contextrail-template:modules:auth:domain:route-guard
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: domain
boundedContext: auth
dependsOn: modules/auth/ports/auth-port.mjs
owns: Pure route-access evaluation logic given an AuthPort and a route config; redirect decision result shape.
boundaries: Must not perform navigation, manipulate history, or import any framework router. Navigation is the caller's responsibility.
invariants: canActivate must return a deterministic result for the same auth state and route config; unauthenticated access to a protected route must always yield a redirect; public routes must always yield allow.
risks: Route config drift (e.g. missing requiresAuth flag) can silently open protected routes; callers ignoring the redirect result bypass the guard.
notesForLLM: This is pure domain logic — framework-free. The return value is a decision record (allow | redirect), not an imperative side effect. Callers own the navigation.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-067
related:
  - modules/auth/public-api.mjs
  - modules/auth/ports/auth-port.mjs
summary: Pure route-access evaluator that checks auth state and role requirements against a route config, returning an allow-or-redirect decision without performing navigation.
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

# route-guard.mjs
