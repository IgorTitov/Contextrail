---
fileId: contextrail-template:scripts:detach-module
module: scripts
stability: evolving
steward: shared
api: "CLI: node scripts/detach-module.mjs"
dependsOn:
  - modules/{each}/manifest.json
  - node:fs
  - node:path
summary: CLI tool that reads module manifests, validates the dependency graph, and safely removes a named hex module along with its test files from the template repository.
owns: CLI for safely removing a named hex module (directory + test files) from the template, with dependency-graph validation and --dry-run/--force/--list modes.
boundaries: Must not modify application-layer files (apps/), docs outside docs/backlog/, or any file not referenced by the module's manifest.json; must not silently skip dependency warnings without --force.
invariants: loadManifests() is the single source of module metadata; --dry-run must never write or delete files; detachModule() must abort on dependent modules unless --force is set; exported functions must remain pure enough to unit-test without a real filesystem.
risks: Destructive file removal is irreversible outside git; missing or malformed manifest.json will silently skip a module; --force removes modules even with dependents, potentially leaving broken imports in other modules.
securityPrivacy: Deletes files from the repository; must only be run intentionally and with a clean git working tree.
notesForLLM: Exports loadManifests, buildDependentMap, findBacklogReferences, detachModule for unit testing with injected root paths. The shebang must stay on line 1. --dry-run path must never call rmSync.
tests: tests/unit/detach-module.test.mjs
linkedDocs:
  - docs/guides/module-detachment.md
  - docs/backlog/module-detachment.md
specRefs: TPL-131
related:
  - tests/unit/detach-module.test.mjs
  - docs/guides/module-detachment.md
---

# detach-module.mjs
