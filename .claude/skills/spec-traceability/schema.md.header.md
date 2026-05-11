---
fileId: contextrail-template:.claude:skills:spec-traceability:schema
module: .claude/skills/spec-traceability
stability: evolving
steward: human
api: Schema reference
dependsOn:
  - .claude/skills/spec-traceability/SKILL.md
  - scripts/checks/spec-check.mjs
  - scripts/checks/spec-sync.mjs
summary: Define the local trace-yaml schema so work-item metadata stays structurally consistent across specification artifacts.
owns: The local trace-yaml schema reference used for structured work-item metadata.
boundaries: This file defines structure only. It must not turn into a process guide, examples file, or second copy of the main skill method.
invariants: The schema stays explicit, machine-readable, and aligned with current traceability scripts and artifact expectations.
risks: Drift here can break structured traceability, create mismatched fields, or conflict with the sync and check scripts.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as the structure reference for trace-yaml blocks. Keep it explicit, stable, and consistent with the current check/sync scripts.
tests:
  - scripts/checks/spec-check.mjs
  - manual review during schema changes
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/spec-traceability/examples.md
  - scripts/checks/spec-check.mjs
---

# schema.md
