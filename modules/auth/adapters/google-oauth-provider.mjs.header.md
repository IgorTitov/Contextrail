---
name: google-oauth-provider.mjs
description: Google OAuth 2.0 adapter — builds authorize URL, exchanges code+PKCE verifier at token endpoint, fetches userinfo; fetch is injectable.
type: adapter
layer: module
hex: adapter
context: auth
public: true
edit: careful
specRefs:
  - TPL-001
---

# google-oauth-provider.mjs

Real Google OAuth 2.0 provider behind `OAuthProviderPort`. Uses the
injected `fetchImpl` (defaults to global `fetch`) to POST the
authorization code and PKCE verifier to `oauth2.googleapis.com/token`
and to GET the OpenID Connect `/userinfo` endpoint. Requires
`clientId` + `clientSecret` at construction; all other endpoints are
overrideable for testing.
