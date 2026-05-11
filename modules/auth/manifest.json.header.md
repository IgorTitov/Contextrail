---
fileId: contextrail-template:modules:auth:manifest
module: modules/auth
stability: evolving
steward: shared
api: Module manifest
boundedContext: auth
dependsOn: modules/auth/manifest.json
summary: Declare the auth module structure, dependencies, and test files for tooling and discovery.
owns: The structural declaration for the auth bounded module.
boundaries: This file declares structure only. It must not contain logic or configuration.
invariants: The adapters list must match the actual files in adapters/. The external dependencies list must match package.json.
risks: Drift between manifest and actual file structure can confuse tooling.
notesForLLM: Update this manifest when adding or removing adapters, domain files, or changing external dependencies.
tests: tests/contract/auth-hex-contract.test.mjs
linkedDocs: modules/auth/README.md
specRefs:
  - TPL-062
  - TPL-135
related: modules/auth/public-api.mjs
---

# manifest.json
