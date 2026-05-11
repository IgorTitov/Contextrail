---
name: auth-oauth.test.mjs
description: Unit proof for OAuth 2.0 flow domain (PKCE, state, authorize URL, profile mappers), port assertion, and Google/GitHub/memory adapters with stubbed fetch.
type: test
layer: tests
public: false
edit: careful
specRefs:
  - TPL-001
---

# auth-oauth.test.mjs

Unit coverage for the new OAuth 2.0 slice in `modules/auth/`. Uses a
deterministic seeded random source for the pure domain tests and
stubs `fetchImpl` for the Google and GitHub provider adapters so no
network is touched.
