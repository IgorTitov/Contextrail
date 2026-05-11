---
fileId: contextrail-template:tests:unit:create-module
module: tests/unit
stability: evolving
steward: shared
api: "Unit test suite"
dependsOn:
  - scripts/checks/create-module.mjs
summary: Unit tests for the create-module scaffolding helpers.
owns: Coverage for validateModuleName, toPascalCase, toCamelCase, buildModuleFiles, and writeModuleFiles.
boundaries: Test code only. Disk-side tests run against an os.tmpdir() directory and clean up after themselves.
invariants: Helpers stay pure and import-safe. Adding a new generated file means asserting both its presence and its header shape here.
risks: Drift between this generator and the example-greeter convention surfaces here first.
securityPrivacy: Tmp filesystem only; no network.
notesForLLM: Keep tests deterministic — avoid assertions on absolute paths or timestamps.
tests:
  - self
linkedDocs:
  - scripts/checks/create-module.mjs
specRefs:
  - TPL-001
---

# create-module.test.mjs
