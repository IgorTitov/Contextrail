---
fileId: contextrail-template:scripts:checks:create-module
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/create-module.mjs --name=<kebab-name> [--description=...] [--force]"
dependsOn:
  - modules/example-greeter (template reference)
summary: Scaffold a new hex module skeleton with the canonical domain/ports/adapters/public-api/messages/manifest/README layout and ADR-0009 sidecar headers on every file.
owns: Pure helpers (validateModuleName, toPascalCase, toCamelCase, buildModuleFiles, writeModuleFiles) plus the CLI that writes them to disk.
boundaries: File generation only. Does not run capabilities-sync, install hooks, or modify any files outside modules/<name>/. Refuses to overwrite an existing module without --force.
invariants: Generated files match the example-greeter convention exactly so capabilities-sync, header-check, readme-check, and architecture-check pass without manual fixup. Pure helpers stay import-safe for tests.
risks: Generator drift — when example-greeter conventions change (header format, manifest shape, sidecar fields), this script must follow. Cover with unit tests on every change.
securityPrivacy: Local filesystem only; no network or shell exec.
notesForLLM: Pure helpers are exported. Tests should call buildModuleFiles() with a sample name and assert the file map shape; use writeModuleFiles() against an os.tmpdir() to test disk-side behavior.
tests:
  - tests/unit/create-module.test.mjs
linkedDocs:
  - scripts/checks/README.md
  - modules/example-greeter/README.md
specRefs:
  - TPL-001
---

# create-module.mjs
