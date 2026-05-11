---
fileId: contextrail-template:.claude:agents:tech-writer
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/readme-discipline/SKILL.md
  - .claude/skills/changelog-release/SKILL.md
summary: Route structured documentation work to a subagent that maintains PRD, USM, backlog, ADR, README, and traceability artifacts without inventing new schemas.
owns: The operational contract for structured documentation maintenance across PRD, USM, backlog, ADR, README, and traceability artifacts.
boundaries: This file defines when and how to use the tech-writer agent. It must not invent undocumented schemas or replace the detailed skill documents it depends on.
invariants: The agent should preserve documented schemas, keep trace blocks structured, and avoid free-form drift across linked docs.
risks: Drift here can normalize schema invention, documentation mismatch, or weak traceability across artifacts.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent for structured docs work, not for ad-hoc prose polishing alone. Preserve declared schemas and improve traceability instead of inventing new layouts.
tests:
  - Manual invocation on docs-heavy change sets
  - consistency review against referenced skills
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/skills/readme-discipline/SKILL.md
  - .claude/skills/changelog-release/SKILL.md
related:
  - .claude/rules/docs.md
  - docs/README.md
---

# tech-writer.md
