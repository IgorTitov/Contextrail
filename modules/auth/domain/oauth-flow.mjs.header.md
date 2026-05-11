---
name: oauth-flow.mjs
description: Pure OAuth 2.0 primitives — base64url, PKCE pair, state, authorize URL, Google/GitHub profile mappers; all crypto primitives injected.
type: domain
layer: module
hex: domain
context: auth
public: false
edit: careful
specRefs:
  - TPL-001
---

# oauth-flow.mjs

Framework-free OAuth 2.0 with PKCE helpers. Callers inject
`randomBytes` and `sha256` so the domain has no `node:crypto`
dependency and unit tests stay deterministic. Contains the RFC 7636
base64url encoder, PKCE pair generator, opaque state generator,
authorize URL builder, and provider-specific profile-to-AuthUser
mappers for Google and GitHub.
