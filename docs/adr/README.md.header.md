---
fileId: contextrail-template:docs:adr:README
module: docs/adr
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/adr/0001-template-scope.md
  - docs/adr/0002-trunk-based-delivery.md
  - docs/adr/0003-architecture-metadata-for-ai-cockpit.md
  - docs/adr/0004-multi-platform-seams.md
  - docs/adr/0005-js-jsdoc-over-typescript.md
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0007-tiered-file-size-limits.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
summary: Explain the architecture decision record area and how ADR files are used to capture durable design decisions in the template.
owns: The folder-level guide to architecture decision records for this template.
boundaries: This file is an ADR folder guide only. It must not duplicate the full contents of each decision record.
invariants: The ADR area remains focused on durable architectural or workflow decisions rather than transient implementation notes.
risks: Drift here can blur the difference between stable decisions and temporary working notes.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to explain when a decision deserves an ADR and where to find past decisions.
tests: node scripts/checks/control-plane-check.mjs
linkedDocs: docs/README.md
related:
  - docs/adr/0001-template-scope.md
  - docs/adr/0002-trunk-based-delivery.md
  - docs/adr/0003-architecture-metadata-for-ai-cockpit.md
  - docs/adr/0004-multi-platform-seams.md
  - docs/adr/0005-js-jsdoc-over-typescript.md
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0007-tiered-file-size-limits.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
---

# README.md
