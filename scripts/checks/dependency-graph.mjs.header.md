---
fileId: contextrail-template:scripts:checks:dependency-graph
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/dependency-graph.mjs [--check]"
dependsOn:
  - node:fs
  - node:path
  - modules/[each]/manifest.json
summary: Generate the single merged dependency graph (docs/_generated/dependency-graph.json) — forward deps, reverse deps, consumer edges, layers, and removal order.
owns: Generation and validation of docs/_generated/dependency-graph.json from module manifests and import scans.
boundaries: Reads manifest.json files and scans source roots for import statements. Writes only to docs/_generated/dependency-graph.json.
invariants: Output JSON must reflect actual manifest.json dependency declarations and import-based consumer edges. The --check flag must exit non-zero if the file is stale.
risks: Bare-package and aliased imports are not resolved, so consumers reached through a workspace alias will be invisible. The right fix when an alias is introduced is to extend resolveImport.
securityPrivacy: Local filesystem only; no network access.
notesForLLM: Run this script after any module addition, removal, or dependency change. Use --check in CI/pre-commit to detect drift. This is the single merged dependency surface — it replaces the former separate DEPENDENCY_GRAPH.json and module-consumers.json.
tests: tests/unit/architecture-graph.test.mjs
linkedDocs:
  - docs/SYSTEM_MAP.md
  - docs/_generated/dependency-graph.json
related:
  - scripts/checks/architecture-check.mjs
  - scripts/detach-module.mjs
---

# dependency-graph.mjs
