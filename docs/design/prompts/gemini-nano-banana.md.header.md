---
fileId: contextrail-template:docs:design:prompts:gemini-nano-banana
module: docs/design/prompts
stability: evolving
steward: shared
api: Prompt template document
dependsOn:
  - docs/design/brandbook.md
  - docs/design/design-system.md
summary: Provide a reusable prompt template and review checklist for Gemini Nano Banana mockup generation.
owns: The reusable Gemini Nano Banana prompt structure for design-mockup work in this template.
boundaries: This file owns a prompt template only. It must not become the full design-system or brandbook.
invariants: The template stays tied to workflow, state coverage, and review criteria instead of generic aesthetic fluff.
risks: Drift here can normalize vague prompts that generate pretty but unusable output.
securityPrivacy: Documentation content only; avoid embedding secrets, credentials, or private service URLs.
notesForLLM: Keep prompts concrete, stateful, and implementable. Mention workflow, screens, constraints, and review criteria.
tests: node scripts/checks/design-docs-check.mjs
linkedDocs:
  - docs/design/prompts/README.md
  - docs/design/brandbook.md
  - docs/design/design-system.md
related: docs/design/prompts/google-stitch.md
---

# gemini-nano-banana.md
