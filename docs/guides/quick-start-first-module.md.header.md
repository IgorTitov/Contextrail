---
fileId: contextrail-template:docs:guides:quick-start-first-module
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/guides/getting-started.md
  - docs/module-catalog.md
summary: Hands-on tutorial for creating a hexagonal module from scratch with complete code examples.
owns: The hands-on quick-start tutorial for building a new hex module.
boundaries: Teaching document only. Does not replace getting-started.md (setup) or module-catalog.md (reference).
invariants: Code examples must be runnable. File paths must match the hex module convention.
risks: Stale code examples if the hex pattern changes. Verify against a real module when updating.
securityPrivacy: No secrets.
notesForLLM: This is the recommended tutorial for users who want to learn the hex pattern by doing. Walk through it step by step.
linkedDocs:
  - docs/guides/getting-started.md
  - docs/guides/README.md
  - docs/module-catalog.md
related:
  - modules/example-greeter/
  - docs/architecture/hex-metadata-convention.md
---

# quick-start-first-module.md
