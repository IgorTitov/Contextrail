---
fileId: contextrail-template:modules:state:manifest
module: modules/state
stability: evolving
steward: shared
api: Module manifest
boundedContext: state
dependsOn: modules/state/manifest.json
summary: Declare the state module structure, dependencies, and test files for tooling and discovery.
owns: The structural declaration for the state bounded module.
boundaries: This file declares structure only. It must not contain logic or configuration.
invariants: The adapters list must match the actual files in adapters/. The testFiles list must match existing test files.
risks: Drift between manifest and actual file structure can confuse tooling.
notesForLLM: Update this manifest when adding or removing adapters, domain files, or changing test files.
tests: tests/contract/state-hex-contract.test.mjs
linkedDocs: modules/state/README.md
specRefs:
  - TPL-048
  - TPL-052
related: modules/state/public-api.mjs
---

# manifest.json
