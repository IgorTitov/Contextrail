---
fileId: contextrail-template:.claude:rules:docs
module: .claude/rules
stability: evolving
steward: shared
api: Topic rule document
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/readme-discipline/SKILL.md
  - .claude/skills/header-sidecar/SKILL.md
summary: Capture the short repository-local documentation and traceability rules that keep structured docs, headers, and linked artifacts consistent.
owns: The short rule set for traceability consistency, structured docs, README coverage, and file header discipline.
boundaries: This file states concise documentation rules only. It must not become a full docs workflow manual or duplicate the detailed skills.
invariants: Documentation rules stay short, enforceable, and aligned with the structured schemas actually used in the repo.
risks: Drift here can normalize docs mismatch, missing trace links, or stale headers and READMEs.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read this rule file when traceability or documentation alignment is at stake. Keep rules specific, schema-aware, and easy to enforce.
tests:
  - scripts/checks/header-check.mjs
  - scripts/checks/readme-check.mjs
  - scripts/checks/spec-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/header-sidecar/SKILL.md
related:
  - .claude/agents/tech-writer.md
  - .claude/agents/header-guardian.md
  - .claude/agents/readme-guardian.md
---

# docs.md
