---
fileId: contextrail-template:.claude:skills:spec-traceability:examples
module: .claude/skills/spec-traceability
stability: evolving
steward: shared
api: Reference examples
dependsOn:
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/spec-traceability/schema.md
summary: Show good and bad traceability examples so agents can compare proposed work-item linkage against concrete patterns.
owns: The reference examples for good and bad traceability patterns across work-item artifacts.
boundaries: This file provides examples only. It must not become a second rule set or replace the skill method and schema reference.
invariants: Examples stay concise, contrastive, and aligned with the current traceability expectations used in the repository.
risks: Drift here can normalize weak linkage patterns or conflict with the canonical traceability method.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to compare proposed traceability patterns against concrete examples. Keep the examples small, contrastive, and current.
tests: Manual review during traceability updates and schema revisions
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/spec-traceability/schema.md
---

# examples.md
