---
fileId: contextrail-template:scripts:checks:header-semantic-fill
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/header-semantic-fill.mjs"
dependsOn:
  - scripts/lib/header.mjs
  - scripts/lib/fs-helpers.mjs
summary: Batch fill semantic header fields (Owns, Boundaries, Invariants, NotesForLLM) using path-pattern heuristics.
owns: Batch generation and injection of semantic header field values for files with placeholder _none_ values.
boundaries: Fills header fields only. Does not modify file content below the header.
invariants: Must not overwrite existing non-placeholder semantic values. Must support --dry-run mode.
risks: Heuristic-generated values may be generic. Manual review recommended for critical files.
securityPrivacy: Local filesystem only. No secrets.
notesForLLM: Batch tool for filling _none_ semantic fields. Uses path patterns to generate Owns, Boundaries, Invariants, NotesForLLM. Run with --dry-run first.
linkedDocs:
  - scripts/checks/header-check.mjs
  - scripts/checks/header-fix.mjs
related: scripts/checks/header-create.mjs
---

# header-semantic-fill.mjs
