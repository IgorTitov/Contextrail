---
fileId: contextrail-template:tests:unit:permission.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the permission module.
owns: Unit proof of permission module domain logic (createRoleHierarchy, matchRule), port contract validation (assertPermissionPort), and adapter correctness (static-rules and dynamic-permission adapters).
boundaries: Must import only through modules/permission/public-api.mjs; must not test UI authorization flows or DOM gating; must not reach into modules/auth internals even though permission depends on auth.
invariants: All imports must go through public-api.mjs; assertPermissionPort must throw on any adapter missing required methods (can, cannot, grant, revoke, getRulesForRole, setUser); role hierarchy tests must be deterministic and stateless.
notesForLLM: Import exclusively via public-api.mjs. Permission module depends on auth; do not reach into auth internals — stub auth context via public-api only. Role hierarchy and matchRule are pure domain functions that require no beforeEach setup.
tests: node:test runner via pnpm test:unit
related: tests/contract/permission-hex-contract.test.mjs
specRefs:
  - TPL-157
  - TPL-158
  - TPL-159
---

# permission.test.mjs
