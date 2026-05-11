---
fileId: contextrail-template:modules:permission:public-api
module: modules/permission
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: permission
dependsOn:
  - modules/permission/ports/permission-port.mjs
  - modules/permission/domain/permission-check.mjs
  - modules/permission/domain/rule-matcher.mjs
  - modules/permission/adapters/static-rules-adapter.mjs
  - modules/permission/adapters/dynamic-adapter.mjs
summary: Public API facade for the permission module — re-exports port assertion, permission checks, rule matching, and adapter factories.
owns: The single cross-module entry point for the permission bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/permission.test.mjs
  - tests/contract/permission-hex-contract.test.mjs
  - tests/bdd/permission.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/permission/README.md
  - docs/_generated/dependency-graph.json
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertPermissionPort
  - checkAccess
  - createDynamicPermissionAdapter
  - createRoleHierarchy
  - createStaticRulesAdapter
  - getLocale
  - matchRule
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

