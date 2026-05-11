---
fileId: contextrail-template:modules:auth:adapters:jwt-test-helpers
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: adapter
boundedContext: auth
dependsOn: jose
summary: Provide test utilities for generating signed JWTs so that JWT adapter tests and integration tests can work with real cryptographic tokens.
owns: Ephemeral key generation and token signing for JWT adapter test scenarios.
boundaries: Test-only utilities. Must not be used in production auth flows.
invariants: Keys are ephemeral (generated per call); tokens are real signed JWTs suitable for verification by the JWT adapter.
risks: Accidental use in production would bypass proper key management.
securityPrivacy: Generates ephemeral cryptographic keys for testing. Keys must not be persisted or reused across deployments.
notesForLLM: Use these helpers in tests to create real signed tokens. Always generate fresh keys per test to avoid cross-test leakage.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-135
related: modules/auth/adapters/jwt-adapter.mjs
allowedDependencies: jose
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: credential
---

# jwt-test-helpers.mjs
