---
name: oauth.mjs
description: OAuth 2.0 start + callback handlers — builds authorize URL with PKCE+state, exchanges code at callback, returns user; pending state kept in-memory.
type: route
layer: app
public: false
edit: careful
specRefs:
  - TPL-001
---

# oauth.mjs

Two tiny handlers wiring the `OAuthProviderPort` into an HTTP flow.
`createOAuthStartHandler` produces the authorize URL and stores the
PKCE verifier keyed by state; `createOAuthCallbackHandler` looks the
verifier up, exchanges the code for tokens, and fetches the user
profile. Deliberately does not mint a session cookie — that decision
is left to the app embedding the starter.
