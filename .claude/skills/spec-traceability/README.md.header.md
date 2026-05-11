---
fileId: contextrail-template:.claude:skills:spec-traceability:README
module: .claude/skills/spec-traceability
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/spec-traceability/schema.md
  - .claude/skills/spec-traceability/examples.md
summary: Introduce the spec-traceability skill folder and clarify when to use it for cross-artifact work-item consistency.
owns: The folder-level entrypoint for the spec-traceability skill and its supporting references.
boundaries: This file is a quick folder guide only. It must not duplicate the detailed method or absorb the schema and examples content.
invariants: The README stays short, traceability-focused, and aligned with the actual supporting files in the folder.
risks: Drift here can hide the schema and examples or blur how the skill should be used alongside them.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the method and the supporting files for concrete schema and example details.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/spec-traceability/schema.md
  - .claude/skills/spec-traceability/examples.md
---

# README.md
