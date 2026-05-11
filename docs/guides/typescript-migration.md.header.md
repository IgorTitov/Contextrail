---
fileId: contextrail-template:docs:guides:typescript-migration
module: docs/guides
stability: evolving
steward: shared
api: Documentation
summary: Guide for migrating Contextrail hex modules from .mjs to TypeScript.
owns: Per-module TypeScript migration steps covering rename, imports, types, sidecars, and manifest updates.
boundaries: Covers module migration only. Does not cover scripts/ or apps/ TypeScript setup.
invariants: Migration order recommendation must match actual module dependency graph.
risks: Stale if architecture-check regex or manifest schema changes.
securityPrivacy: No secrets.
notesForLLM: This is a forward-looking guide. The template currently uses .mjs; TS migration is optional.
related:
  - scripts/checks/architecture-check.mjs
  - docs/guides/getting-started.md
---

# typescript-migration.md
