---
fileId: contextrail-template:docs:design:prompts:google-stitch
module: docs/design/prompts
stability: evolving
steward: shared
api: Prompt template document
dependsOn:
  - docs/design/brandbook.md
  - docs/design/design-system.md
summary: Provide a reusable prompt template and review checklist for Google Stitch design-output generation and assessment.
owns: The reusable Google Stitch prompt structure for design-output generation in this template.
boundaries: This file owns a prompt template only. It must not become the full design-system or brandbook.
invariants: The template stays tied to workflow, state coverage, and review criteria instead of generic visual prompting.
risks: Drift here can normalize prompts that produce outputs with weak state coverage or poor implementation handoff value.
securityPrivacy: Documentation content only; avoid embedding secrets, credentials, or private service URLs.
notesForLLM: Keep prompts tied to real workflow and state needs. Require review against implementation feasibility instead of aesthetic novelty alone.
tests: node scripts/checks/design-docs-check.mjs
linkedDocs:
  - docs/design/prompts/README.md
  - docs/design/brandbook.md
  - docs/design/design-system.md
related: docs/design/prompts/gemini-nano-banana.md
---

# google-stitch.md
