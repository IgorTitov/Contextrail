---
fileId: contextrail-template:docs:guides:brownfield-migration
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn: .claude/rules/architecture.md
summary: Step-by-step guide for migrating existing framework-based applications into COA hex architecture without rewriting the UI framework layer.
owns: The canonical brownfield migration path for bringing existing apps into COA.
boundaries: Covers migration strategy only. Does not define hex architecture rules — those live in architecture.md.
invariants: Must always prohibit deleting and rewriting the existing UI framework layer.
risks: If this guide drifts from architecture.md rules, agents may follow conflicting instructions.
securityPrivacy: No secrets.
notesForLLM: This is the canonical brownfield migration guide. The core rule is extract-and-restructure, never rewrite the framework layer.
linkedDocs:
  - docs/guides/framework-integration.md
  - .claude/rules/architecture.md
related: docs/analysis/brownfield-experiment-case-study.md
---

# brownfield-migration.md
