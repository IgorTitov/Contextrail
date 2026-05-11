---
fileId: contextrail-template:modules:auth:adapters:github-oauth-provider
module: auth
stability: stable
steward: shared
summary: GitHub OAuth 2.0 adapter — authorize URL, code+PKCE exchange, user fetch with injectable fetchImpl.
implementsPort: oauth-provider-port
runtimeEnvironment: universal
transport: http/rest
externalSystems:
  - github.com/login/oauth
  - api.github.com/user
---

# github-oauth-provider.mjs
