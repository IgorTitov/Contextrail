---
name: memory-oauth-provider.mjs
description: In-memory OAuthProviderPort with recorded authorize/exchange calls and overrideable token/user-info handlers for deterministic tests.
type: adapter
layer: module
hex: adapter
context: auth
public: true
edit: careful
specRefs:
  - TPL-001
---

# memory-oauth-provider.mjs

Deterministic OAuth provider for tests and demos. Records every
authorize and exchange call, returns preconfigured tokens and profile
by default, and allows injecting custom handlers for edge cases. Used
by `apps/api-starter/` to exercise the full start → callback flow
without hitting any network.
