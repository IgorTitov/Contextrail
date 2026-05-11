---
name: oauth-provider-port.mjs
description: OAuthProviderPort contract — provider name plus buildAuthorizationUrl, exchangeCode, fetchUserInfo; assertOAuthProviderPort validates shape.
type: port
layer: module
hex: port
context: auth
public: true
edit: careful
specRefs:
  - TPL-001
---

# oauth-provider-port.mjs

Defines the `OAuthProviderPort` that Google, GitHub, and in-memory OAuth
adapters must satisfy. The port is deliberately narrow: three pure
methods covering authorize URL construction, code-to-token exchange, and
user profile fetch. Tests use `assertOAuthProviderPort` to enforce the
shape before wiring.
