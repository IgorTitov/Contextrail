---
name: node-oauth-crypto.mjs
description: Node crypto primitives (randomBytes, sha256) wired to the pure oauth-flow domain; exports createNodePkcePair and createNodeOAuthState helpers.
type: adapter
layer: module
hex: adapter
context: auth
public: true
edit: careful
specRefs:
  - TPL-001
---

# node-oauth-crypto.mjs

Bridges `node:crypto` to the pure OAuth flow domain. Server apps wire
`createNodePkcePair` and `createNodeOAuthState` into their callback
handlers so the domain stays framework-free while production code gets
cryptographically strong randomness and a real SHA-256.
