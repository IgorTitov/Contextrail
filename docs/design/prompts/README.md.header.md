---
fileId: contextrail-template:docs:design:prompts:README
module: docs/design/prompts
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/design/prompts/gemini-nano-banana.md
  - docs/design/prompts/google-stitch.md
summary: Explain the prompt-template area for external design and mockup tools used by the designer lane.
owns: The folder-level guide to reusable external-tool prompt templates for the design lane.
boundaries: This file is a prompt-template index only. It must not turn into a catch-all notebook of every design conversation.
invariants: Prompt templates stay reusable, tool-specific when needed, and traceable back to workflow and brand constraints.
risks: Drift here can bury reusable prompt knowledge or make external-tool usage impossible to audit later.
securityPrivacy: Documentation content only; avoid embedding private credentials or private third-party URLs.
notesForLLM: Use this folder for reusable prompt patterns. Keep prompts tied to real workflows, states, and review criteria.
tests: node scripts/checks/design-docs-check.mjs
linkedDocs:
  - docs/design/README.md
  - docs/design/brandbook.md
  - docs/design/design-system.md
related:
  - docs/design/prompts/gemini-nano-banana.md
  - docs/design/prompts/google-stitch.md
---

# README.md
