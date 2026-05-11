---
fileId: contextrail-template:.claude:skills:hex-boundary:module-template
module: .claude/skills/hex-boundary
stability: evolving
steward: shared
api: Reference template
dependsOn: .claude/skills/hex-boundary/SKILL.md
summary: Show the canonical module folder shape that the hex-boundary skill expects when reasoning about modular-monolith structure.
owns: The canonical reference shape for a bounded module folder in this repository style.
boundaries: This file is a structural reference only. It must not become a full architecture guide, generator spec, or project-specific module catalog.
invariants: The template stays small, canonical, and aligned with the current bounded-context directory expectations.
risks: Drift here can confuse module layout expectations and weaken boundary review consistency.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as a compact structural reference during module creation or refactor planning. Keep it canonical and lightweight.
tests: Manual review during structure changes and template updates
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/hex-boundary/SKILL.md
  - .claude/rules/architecture.md
---

# module-template.md
