---
fileId: contextrail-template:.claude:agents:hex-architect
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/hex-boundary/SKILL.md
  - .claude/skills/repo-nav/SKILL.md
  - scripts/checks/architecture-check.mjs
summary: Route structural change review to a subagent that protects module boundaries, layer ownership, public APIs, and hexagonal discipline during refactors or new module work.
owns: The operational contract for architecture-focused review of boundaries, ports, adapters, and public API changes.
boundaries: This file defines when to use the hex-architect agent and what it should protect. It must not duplicate the full architecture rules or become a generic code-review prompt.
invariants: The agent stays focused on structural correctness, public surfaces, and layer discipline rather than implementing business logic.
risks: Drift here can normalize deep imports, framework leakage, or unclear public API boundaries.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent when structure is changing or when refactor safety depends on boundary review. Return concrete boundary findings, not abstract architecture philosophy.
tests:
  - scripts/checks/architecture-check.mjs
  - manual invocation on structural change sets
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/hex-boundary/SKILL.md
  - .claude/rules/architecture.md
related:
  - .claude/agents/repo-cartographer.md
  - scripts/checks/architecture-check.mjs
---

# hex-architect.md
