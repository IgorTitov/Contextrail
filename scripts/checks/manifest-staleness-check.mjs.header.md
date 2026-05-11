---
fileId: contextrail-template:scripts:checks:manifest-staleness-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/manifest-staleness-check.mjs [--json]"
dependsOn:
  - node:fs
  - node:path
summary: Detect drift between manifest.json declarations and actual filesystem.
owns: File count and layer presence drift detection for module manifests.
boundaries: Read-only comparison. Does not auto-fix manifests.
invariants: Must check all modules with a manifest.json. Layer names must match architecture-check.mjs.
risks: False positives if manifest structure schema changes.
securityPrivacy: Local filesystem only.
notesForLLM: Run after adding or removing files in a module to catch manifest drift early.
related:
  - scripts/checks/architecture-check.mjs
---

# manifest-staleness-check.mjs
